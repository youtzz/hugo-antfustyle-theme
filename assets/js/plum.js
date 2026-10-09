/* hugo-antfustyle-theme — ArtPlum 程序化装饰
 * 移植自 antfu.me 的 src/components/ArtPlum.vue
 * 用 L-system 算法在 canvas 上随机生成羽毛/枝叶装饰图
 *
 * 性能（awakestone-blog#116）：
 * - 支持 OffscreenCanvas 时，生长动画放进 Worker（Blob URL，无额外文件、无依赖）。
 *   实测主线程 canvas 每次提交合成都要带上画布，开销和像素数成正比；Worker 直接把帧
 *   交给合成器，主线程不再为它付费。不支持或 Worker 起不来时退回主线程，同一套代码；
 *   主线程模式下长完会把画布换成同像素的 <img>，滚动时就不再带着 canvas。
 * - 画面与原实现相同：画布按设备 devicePixelRatio（不封顶）、逐段 stroke，
 *   径向淡出仍由 .page-decoration 的 CSS mask 负责。
 * 随机数仍在主线程取（Worker 模式预取一段交给 Worker，用完才用 Worker 自己的），
 * 调用顺序与原实现一致。
 */

(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.getElementById('plum-canvas');
  if (!canvas) return;

  var RANDOM_POOL = 1 << 16; /* 实测一次生长 2k–25k 次 */
  var WORKER_READY_MS = 1500;

  /* 生长核心：主线程和 Worker 共用。必须自包含（会被 toString 进 Worker）。
   * onDone() 在长完时调用。 */
  function createPlumRenderer(scope, canvas, ctx, onDone) {
    var r180 = Math.PI;
    var r90 = Math.PI / 2;
    var r15 = Math.PI / 12;
    var MIN_BRANCH = 30;
    var len = 6;
    var MAX_DEPTH = 80;
    var MAX_FRAMES = 60;
    var COLOR = '#88888825';

    var raf = typeof scope.requestAnimationFrame === 'function'
      ? function (cb) { return scope.requestAnimationFrame(cb); }
      : function (cb) { return scope.setTimeout(cb, 16); };

    var steps = [];
    var prevSteps = [];
    var dpr = 1;
    var W = 0;
    var H = 0;
    var generation = 0;
    var pool = null;
    var poolAt = 0;

    function random() {
      if (pool && poolAt < pool.length) return pool[poolAt++];
      return Math.random();
    }

    function step(x, y, rad, counter, depth) {
      if (depth > MAX_DEPTH) return;
      var length = random() * len;
      counter.value += 1;
      var nx = x + length * Math.cos(rad);
      var ny = y + length * Math.sin(rad);

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      var rad1 = rad + random() * r15;
      var rad2 = rad - random() * r15;

      if (nx < -100 || nx > W + 100 || ny < -100 || ny > H + 100) return;

      var rate = counter.value <= MIN_BRANCH ? 0.8 : 0.5;
      if (random() < rate) steps.push([nx, ny, rad1, counter, depth + 1]);
      if (random() < rate) steps.push([nx, ny, rad2, counter, depth + 1]);
    }

    /* o: { w, h, dpr, random?: Float64Array } */
    function render(o) {
      var gen = ++generation;
      pool = o.random || null;
      poolAt = 0;
      dpr = o.dpr;
      var w = W = o.w;
      var h = H = o.h;
      canvas.width = dpr * w;
      canvas.height = dpr * h;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.lineWidth = 1;
      ctx.strokeStyle = COLOR;
      steps = [];

      var randomMiddle = function () { return random() * 0.6 + 0.2; };
      var seedSteps = [
        [randomMiddle() * w, -5, r90],
        [randomMiddle() * w, h + 5, -r90],
        [-5, randomMiddle() * h, 0],
        [w + 5, randomMiddle() * h, r180]
      ];
      if (w < 500) seedSteps.length = 2;

      seedSteps.forEach(function (s) {
        step(s[0], s[1], s[2], { value: 0 }, 0);
      });

      var frameCount = 0;
      function frame() {
        if (gen !== generation) return;
        if (frameCount++ > MAX_FRAMES || steps.length === 0) {
          pool = null;
          if (onDone) onDone(gen);
          return;
        }
        prevSteps = steps;
        steps = [];
        prevSteps.forEach(function (s) {
          if (random() < 0.5) {
            steps.push(s);
          } else {
            step(s[0], s[1], s[2], s[3], s[4]);
          }
        });
        raf(frame);
      }
      raf(frame);
      return gen;
    }

    return {
      render: render,
      current: function () { return generation; }
    };
  }

  /* Worker 入口 */
  function workerMain(createPlumRenderer) {
    var r = null;
    self.onmessage = function (e) {
      var d = e.data;
      if (d.type === 'init') {
        r = createPlumRenderer(self, d.canvas, d.canvas.getContext('2d'), null);
        r.render(d);
      } else if (r && d.type === 'render') {
        r.render(d);
      }
    };
    self.postMessage({ type: 'ready' });
  }

  /* --- 主线程 --- */
  var worker = null;
  var renderer = null;
  var img = null;
  var imgURL = '';

  function viewport(withPool) {
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var o = { w: w, h: h, dpr: window.devicePixelRatio || 1 };
    if (withPool) {
      var pool = new Float64Array(RANDOM_POOL);
      for (var i = 0; i < RANDOM_POOL; i++) pool[i] = Math.random();
      o.random = pool;
    }
    return o;
  }

  /* 主线程模式：长完把画布换成同像素的 <img> */
  function freeze(gen) {
    if (typeof canvas.toBlob !== 'function' || !window.URL || !URL.createObjectURL) return;
    canvas.toBlob(function (blob) {
      if (!blob || gen !== renderer.current() || !canvas.parentNode) return;
      var next = document.createElement('img');
      var url = URL.createObjectURL(blob);
      next.alt = '';
      next.setAttribute('aria-hidden', 'true');
      next.decoding = 'async';
      next.style.cssText = 'display:block;width:' + canvas.style.width + ';height:' + canvas.style.height;
      next.onload = function () {
        if (gen !== renderer.current() || !canvas.parentNode) {
          URL.revokeObjectURL(url);
          return;
        }
        canvas.parentNode.replaceChild(next, canvas);
        img = next;
        imgURL = url;
        canvas.width = 0;
        canvas.height = 0;
      };
      next.src = url;
    });
  }

  function thaw() {
    if (img && img.parentNode) img.parentNode.replaceChild(canvas, img);
    if (imgURL) URL.revokeObjectURL(imgURL);
    img = null;
    imgURL = '';
  }

  function startMainThread() {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderer = createPlumRenderer(window, canvas, ctx, freeze);
    renderer.render(viewport(false));
    wire(function () {
      thaw();
      renderer.render(viewport(false));
    });
  }

  function startWorker() {
    var url;
    var w;
    try {
      var src = '(' + workerMain.toString() + ')(' + createPlumRenderer.toString() + ');';
      url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      w = new Worker(url);
    } catch (e) {
      if (url) URL.revokeObjectURL(url);
      startMainThread();
      return;
    }
    var settled = false;
    function fallback() {
      if (settled) return;
      settled = true;
      try { w.terminate(); } catch (e) { /* ignore */ }
      URL.revokeObjectURL(url);
      startMainThread();
    }
    var timer = setTimeout(fallback, WORKER_READY_MS);
    w.onerror = fallback;
    w.onmessage = function (e) {
      if (settled || !e.data || e.data.type !== 'ready') return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      w.onerror = null;
      var off;
      try {
        off = canvas.transferControlToOffscreen();
      } catch (err) {
        w.terminate();
        startMainThread();
        return;
      }
      worker = w;
        var o = viewport(true);
      o.type = 'init';
      o.canvas = off;
      worker.postMessage(o, [off, o.random.buffer]);
      wire(function () {
        var m = viewport(true);
        m.type = 'render';
        worker.postMessage(m, [m.random.buffer]);
      });
    };
  }

  function wire(onResize) {
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(onResize, 250);
    });
  }

  if (typeof canvas.transferControlToOffscreen === 'function' &&
      typeof Worker === 'function' && typeof Blob === 'function' &&
      window.URL && URL.createObjectURL) {
    startWorker();
  } else {
    startMainThread();
  }
})();
