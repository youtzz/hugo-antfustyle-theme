/* hugo-antfustyle-theme — ArtDots 原点装饰
 * 视觉对齐 antfu.me ArtDots.vue（SCALE/LENGTH/SPACING + 3D simplex），
 * 用 canvas 近似 ParticleContainer，避免 pixi 体积与非 dots 页下载。
 * simplex3D 改编自 Jonas Wagner simplex-noise (MIT)。
 *
 * 性能（awakestone-blog#116）：
 * - 支持 OffscreenCanvas 时，整个绘制循环放进 Worker（Blob URL，无额外文件、无依赖），
 *   主线程只负责尺寸 / 滚动 / 可见性消息。实测主线程 canvas 每次提交合成都要带上画布，
 *   开销和画布像素数成正比；Worker 直接把帧交给合成器，主线程不再为它付费。
 *   不支持或 Worker 起不来（比如 CSP 禁 blob:）时退回主线程，同一套绘制代码。
 * - 画布分辨率最多按 1.5 倍屏（原来封顶 2 倍）。帧率 30 → 20。
 * - 不再每个点拼一次 rgba() 字符串、设一次 fillStyle：透明度量化成 32 档，
 *   同一档的点合成一条 rect path，一帧最多 fill 32 次。
 * - 径向遮罩烤进每个点的透明度：alpha × min(1, 到中心距离 / 中心到最远角距离)，
 *   和原来 CSS mask-image: radial-gradient(circle, transparent, black) 一致；
 *   宿主打上 data-art-mask="baked"，CSS 不再给这层全屏 fixed 元素加 mask。
 * - 页面滚动时暂停，停下 150ms 后继续。
 * 随机数仍在主线程按原顺序取（打乱表 → 每点 opacity），画面逐点对应。
 */

(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.getElementById('dots-canvas');
  if (!canvas) return;

  var BASE_SPACING = 15;
  var MAX_DPR = 1.5;
  var SCROLL_IDLE_MS = 150;
  var WORKER_READY_MS = 1500;

  /* 绘制核心：主线程和 Worker 共用。必须自包含（会被 toString 进 Worker）。
   * scope: window 或 Worker 全局；ctx: 2D 上下文（HTMLCanvas 或 OffscreenCanvas）。 */
  function createDotsRenderer(scope, canvas, ctx) {
    var SCALE = 200;
    var LENGTH = 8;
    var DOT_COLOR = '204,204,204'; /* 0xCCCCCC */
    var TARGET_FPS = 20;
    var FRAME_MS = 1000 / TARGET_FPS;
    var ALPHA_LEVELS = 32;

    /* --- compact 3D simplex --- */
    var F3 = 1 / 3;
    var G3 = 1 / 6;
    var grad3 = new Float64Array([
      1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
      1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1
    ]);
    var perm = new Uint8Array(512);
    var permMod12 = new Uint8Array(512);

    function noise3D(xin, yin, zin) {
      var s = (xin + yin + zin) * F3;
      var i = Math.floor(xin + s);
      var j = Math.floor(yin + s);
      var k = Math.floor(zin + s);
      var t = (i + j + k) * G3;
      var X0 = i - t;
      var Y0 = j - t;
      var Z0 = k - t;
      var x0 = xin - X0;
      var y0 = yin - Y0;
      var z0 = zin - Z0;

      var i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
        else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
      } else {
        if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
        else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
        else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      }

      var x1 = x0 - i1 + G3;
      var y1 = y0 - j1 + G3;
      var z1 = z0 - k1 + G3;
      var x2 = x0 - i2 + 2 * G3;
      var y2 = y0 - j2 + 2 * G3;
      var z2 = z0 - k2 + 2 * G3;
      var x3 = x0 - 1 + 3 * G3;
      var y3 = y0 - 1 + 3 * G3;
      var z3 = z0 - 1 + 3 * G3;

      var ii = i & 255;
      var jj = j & 255;
      var kk = k & 255;

      var n0 = 0, n1 = 0, n2 = 0, n3 = 0;
      var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
      if (t0 >= 0) {
        var gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
        t0 *= t0;
        n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0);
      }
      var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
      if (t1 >= 0) {
        var gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
        t1 *= t1;
        n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1);
      }
      var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
      if (t2 >= 0) {
        var gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
        t2 *= t2;
        n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2);
      }
      var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
      if (t3 >= 0) {
        var gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
        t3 *= t3;
        n3 = t3 * t3 * (grad3[gi3] * x3 + grad3[gi3 + 1] * y3 + grad3[gi3 + 2] * z3);
      }
      return 32 * (n0 + n1 + n2 + n3);
    }

    var n = 0;
    var px = new Float32Array(0);
    var py = new Float32Array(0);
    var popacity = new Float32Array(0);
    var drawX = new Float32Array(0);
    var drawY = new Float32Array(0);
    var level = new Uint8Array(0);
    var order = new Uint32Array(0);
    var counts = new Uint32Array(ALPHA_LEVELS + 1);
    var starts = new Uint32Array(ALPHA_LEVELS + 1);
    var levelStyle = [];
    for (var lv = 0; lv <= ALPHA_LEVELS; lv++) {
      levelStyle.push('rgba(' + DOT_COLOR + ',' + (lv / ALPHA_LEVELS) + ')');
    }
    var w = 0;
    var h = 0;
    var cx = 0;
    var cy = 0;
    var invR = 0;
    var lastFrame = 0;
    var paused = false;
    var hidden = false;
    var ticking = false;
    var raf = typeof scope.requestAnimationFrame === 'function'
      ? function (cb) { return scope.requestAnimationFrame(cb); }
      : function (cb) { return scope.setTimeout(function () { cb(Date.now()); }, 16); };

    function draw() {
      var t = Date.now() / 7500;
      ctx.clearRect(0, 0, w, h);
      var i, rad, len, nx, ny, alpha, dx, dy, m, L, sx, sy;
      for (L = 0; L <= ALPHA_LEVELS; L++) counts[L] = 0;
      for (i = 0; i < n; i++) {
        sx = px[i] / SCALE;
        sy = py[i] / SCALE;
        rad = (noise3D(sx, sy, t) - 0.5) * 2 * Math.PI;
        len = (noise3D(sx, sy, t * 2) + 0.5) * LENGTH;
        nx = px[i] + Math.cos(rad) * len;
        ny = py[i] + Math.sin(rad) * len;
        dx = nx - cx;
        dy = ny - cy;
        m = Math.sqrt(dx * dx + dy * dy) * invR;
        if (m > 1) m = 1;
        alpha = (Math.abs(Math.cos(rad)) * 0.9 + 0.1) * popacity[i] * m;
        L = Math.round(alpha * ALPHA_LEVELS);
        drawX[i] = nx - 1;
        drawY[i] = ny - 1;
        level[i] = L;
        counts[L]++;
      }
      /* 按档位计数排序，同档的点一条 path 画完；第 0 档完全透明，跳过 */
      starts[0] = 0;
      for (L = 1; L <= ALPHA_LEVELS; L++) starts[L] = starts[L - 1] + counts[L - 1];
      for (i = 0; i < n; i++) order[starts[level[i]]++] = i;
      var k = counts[0];
      for (L = 1; L <= ALPHA_LEVELS; L++) {
        var end = k + counts[L];
        if (end === k) continue;
        ctx.beginPath();
        for (; k < end; k++) {
          i = order[k];
          /* 2×2 rect ≈ r=1 circle */
          ctx.rect(drawX[i], drawY[i], 2, 2);
        }
        ctx.fillStyle = levelStyle[L];
        ctx.fill();
      }
    }

    function loop(now) {
      if (paused || hidden || !n) {
        ticking = false;
        return;
      }
      raf(loop);
      if (now - lastFrame < FRAME_MS) return;
      lastFrame = now;
      draw();
    }

    function kick() {
      if (ticking || paused || hidden || !n) return;
      ticking = true;
      lastFrame = 0;
      raf(loop);
    }

    return {
      /* 新尺寸 + 新点阵（x/y/opacity 由主线程按原顺序生成） */
      setup: function (o) {
        var i;
        w = o.w;
        h = o.h;
        canvas.width = Math.floor(w * o.dpr);
        canvas.height = Math.floor(h * o.dpr);
        ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);
        /* radial-gradient(circle, …) 默认 farthest-corner：半径 = 中心到角 */
        cx = w / 2;
        cy = h / 2;
        invR = 1 / Math.sqrt(cx * cx + cy * cy);
        if (o.perm) {
          for (i = 0; i < 512; i++) {
            perm[i] = o.perm[i & 255];
            permMod12[i] = perm[i] % 12;
          }
        }
        px = o.x;
        py = o.y;
        popacity = o.opacity;
        n = px.length;
        drawX = new Float32Array(n);
        drawY = new Float32Array(n);
        level = new Uint8Array(n);
        order = new Uint32Array(n);
        kick();
      },
      setPaused: function (v) { paused = v; kick(); },
      setHidden: function (v) { hidden = v; kick(); }
    };
  }

  /* Worker 入口：只做消息转发 */
  function workerMain(createDotsRenderer) {
    var r = null;
    self.onmessage = function (e) {
      var d = e.data;
      if (d.type === 'init') {
        r = createDotsRenderer(self, d.canvas, d.canvas.getContext('2d', { alpha: true }));
        r.setup(d);
      } else if (!r) {
        return;
      } else if (d.type === 'setup') {
        r.setup(d);
      } else if (d.type === 'paused') {
        r.setPaused(d.value);
      } else if (d.type === 'hidden') {
        r.setHidden(d.value);
      }
    };
    self.postMessage({ type: 'ready' });
  }

  /* --- 主线程：随机数（顺序与原实现一致）与点阵 --- */
  function buildPerm() {
    var p = new Uint8Array(256);
    var i;
    for (i = 0; i < 256; i++) p[i] = i;
    var n = 256;
    while (n) {
      var k = Math.floor(Math.random() * n--);
      var t = p[n];
      p[n] = p[k];
      p[k] = t;
    }
    return p;
  }

  function pickSpacing(width) {
    if (width < 500) return 24;
    if (width < 900) return 20;
    return BASE_SPACING;
  }

  var permTable = buildPerm();

  function makeSetup(withPerm) {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var spacing = pickSpacing(w);
    var xs = [];
    var ys = [];
    var os = [];
    var existing = Object.create(null);
    var x, y, id;
    for (x = -spacing / 2; x < w + spacing; x += spacing) {
      for (y = -spacing / 2; y < h + spacing; y += spacing) {
        id = x + '-' + y;
        if (existing[id]) continue;
        existing[id] = 1;
        xs.push(x);
        ys.push(y);
        os.push(Math.random() * 0.5 + 0.5);
      }
    }
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var o = {
      w: w,
      h: h,
      dpr: Math.min(window.devicePixelRatio || 1, MAX_DPR),
      x: new Float32Array(xs),
      y: new Float32Array(ys),
      opacity: new Float32Array(os)
    };
    if (withPerm) o.perm = permTable;
    return o;
  }

  var host = canvas.parentNode;
  var renderer = null; /* 主线程模式 */
  var worker = null;   /* Worker 模式 */

  function send(type, extra) {
    if (worker) {
      var msg = extra || {};
      msg.type = type;
      var transfer = [];
      if (msg.x) transfer.push(msg.x.buffer, msg.y.buffer, msg.opacity.buffer);
      worker.postMessage(msg, transfer);
    } else if (renderer) {
      if (type === 'setup') renderer.setup(extra);
      else if (type === 'paused') renderer.setPaused(extra.value);
      else if (type === 'hidden') renderer.setHidden(extra.value);
    }
  }

  function bake() {
    if (host && host.setAttribute) host.setAttribute('data-art-mask', 'baked');
  }

  function startMainThread() {
    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    bake();
    renderer = createDotsRenderer(window, canvas, ctx);
    renderer.setup(makeSetup(true));
    wire();
  }

  function startWorker() {
    var url;
    var w;
    try {
      var src = '(' + workerMain.toString() + ')(' + createDotsRenderer.toString() + ');';
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
      var o = makeSetup(true);
      o.canvas = off;
      o.type = 'init';
      worker.postMessage(o, [off, o.x.buffer, o.y.buffer, o.opacity.buffer]);
      wire();
    };
  }

  function wire() {
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { send('setup', makeSetup(false)); }, 250);
    });

    /* 滚动期间停帧（画面停在最后一帧），停下 SCROLL_IDLE_MS 后继续 */
    var scrolling = false;
    var scrollTimer = 0;
    window.addEventListener('scroll', function () {
      if (!scrolling) {
        scrolling = true;
        send('paused', { value: true });
      }
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        scrolling = false;
        send('paused', { value: false });
      }, SCROLL_IDLE_MS);
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      send('hidden', { value: document.hidden });
    });
  }

  if (typeof canvas.transferControlToOffscreen === 'function' &&
      typeof Worker === 'function' && typeof Blob === 'function' &&
      typeof URL !== 'undefined' && URL.createObjectURL) {
    startWorker();
  } else {
    startMainThread();
  }
})();
