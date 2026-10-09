/* hugo-antfustyle-theme — ArtPlum 程序化装饰
 * 移植自 antfu.me 的 src/components/ArtPlum.vue
 * 用 L-system 算法在 canvas 上随机生成羽毛/枝叶装饰图
 *
 * 性能（awakestone-blog#116）：
 * - 支持 OffscreenCanvas 时，生长动画放进 Worker（Blob URL，无额外文件、无依赖）。
 *   实测主线程 canvas 每次提交合成都要带上画布，开销和像素数成正比；Worker 直接把帧
 *   交给合成器，主线程不再为它付费。不支持或 Worker 起不来时退回主线程，同一套代码；
 *   主线程模式下长完会把画布换成同像素的 <img>，滚动时就不再带着 canvas。
 * - 画布分辨率最多按 1.5 倍屏（原来跟 devicePixelRatio 走，3 倍屏是 1170×2532）。
 * - 每帧新长出的枝段合成一条 path、只 stroke 一次（原来每段一次 beginPath/stroke）。
 * - 径向遮罩烤进画布：枝条先画在离屏画布上，每帧贴到可见画布，再用 destination-in
 *   乘一次径向渐变，和原来 CSS mask-image: radial-gradient(circle, transparent, black)
 *   算法一致（圆形、farthest-corner、alpha 0→1 线性）。宿主打上 data-art-mask="baked"，
 *   CSS 不再给这层全屏 fixed 元素加 mask。
 * 随机数仍在主线程取（Worker 模式预取一段交给 Worker，用完才用 Worker 自己的），
 * 调用顺序与原实现一致。
 */

(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.getElementById('plum-canvas');
  if (!canvas) return;

  var MAX_DPR = 1.5;
  var RANDOM_POOL = 1 << 16; /* 实测一次生长 2k–25k 次 */
  var WORKER_READY_MS = 1500;

  /* 生长核心：主线程和 Worker 共用。必须自包含（会被 toString 进 Worker）。
   * makeCanvas(w, h) 造离屏画布；onDone() 在长完时调用。 */
  function createPlumRenderer(scope, canvas, ctx, makeCanvas, onDone) {
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

    var art = null;
    var actx = null;
    var steps = [];
    var prevSteps = [];
    var mask = null;
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

      /* 只记进本帧的 path，帧末统一 stroke */
      actx.moveTo(x, y);
      actx.lineTo(nx, ny);

      var rad1 = rad + random() * r15;
      var rad2 = rad - random() * r15;

      if (nx < -100 || nx > W + 100 || ny < -100 || ny > H + 100) return;

      var rate = counter.value <= MIN_BRANCH ? 0.8 : 0.5;
      if (random() < rate) steps.push([nx, ny, rad1, counter, depth + 1]);
      if (random() < rate) steps.push([nx, ny, rad2, counter, depth + 1]);
    }

    /* 可见画布 = 离屏枝条 × 径向遮罩 */
    function present() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(art, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = mask;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }

    /* o: { w, h, dpr, random?: Float64Array } */
    function render(o) {
      var gen = ++generation;
      pool = o.random || null;
      poolAt = 0;
      dpr = o.dpr;
      var w = W = o.w;
      var h = H = o.h;
      canvas.width = Math.round(dpr * w);
      canvas.height = Math.round(dpr * h);
      art = makeCanvas(canvas.width, canvas.height);
      actx = art.getContext('2d');
      actx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* radial-gradient(circle, transparent, black)：圆心在中心，半径到最远角 */
      var cx = w / 2;
      var cy = h / 2;
      mask = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.sqrt(cx * cx + cy * cy));
      mask.addColorStop(0, 'rgba(0,0,0,0)');
      mask.addColorStop(1, 'rgba(0,0,0,1)');

      actx.lineWidth = 1;
      actx.strokeStyle = COLOR;
      steps = [];

      var randomMiddle = function () { return random() * 0.6 + 0.2; };
      var seedSteps = [
        [randomMiddle() * w, -5, r90],
        [randomMiddle() * w, h + 5, -r90],
        [-5, randomMiddle() * h, 0],
        [w + 5, randomMiddle() * h, r180]
      ];
      if (w < 500) seedSteps.length = 2;

      actx.beginPath();
      seedSteps.forEach(function (s) {
        step(s[0], s[1], s[2], { value: 0 }, 0);
      });
      actx.stroke();
      present();

      var frameCount = 0;
      function frame() {
        if (gen !== generation) return;
        if (frameCount++ > MAX_FRAMES || steps.length === 0) {
          /* 长完了：可见画布即最终结果，释放离屏画布 */
          art.width = 0;
          art.height = 0;
          art = actx = null;
          pool = null;
          if (onDone) onDone(gen);
          return;
        }
        prevSteps = steps;
        steps = [];
        actx.beginPath();
        prevSteps.forEach(function (s) {
          if (random() < 0.5) {
            steps.push(s);
          } else {
            step(s[0], s[1], s[2], s[3], s[4]);
          }
        });
        actx.stroke();
        present();
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
    function makeCanvas(w, h) { return new OffscreenCanvas(w, h); }
    self.onmessage = function (e) {
      var d = e.data;
      if (d.type === 'init') {
        r = createPlumRenderer(self, d.canvas, d.canvas.getContext('2d'), makeCanvas, null);
        r.render(d);
      } else if (r && d.type === 'render') {
        r.render(d);
      }
    };
    self.postMessage({ type: 'ready' });
  }

  /* --- 主线程 --- */
  var host = canvas.parentNode;
  var worker = null;
  var renderer = null;
  var img = null;
  var imgURL = '';

  function bake() {
    if (host && host.setAttribute) host.setAttribute('data-art-mask', 'baked');
  }

  function viewport(withPool) {
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var o = { w: w, h: h, dpr: Math.min(window.devicePixelRatio || 1, MAX_DPR) };
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
    bake();
    renderer = createPlumRenderer(window, canvas, ctx, function (w, h) {
      var c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    }, freeze);
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
      bake();
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
      typeof OffscreenCanvas === 'function' &&
      window.URL && URL.createObjectURL) {
    startWorker();
  } else {
    startMainThread();
  }
})();
