/* hugo-antfustyle-theme — ArtDots 原点装饰
 * 视觉对齐 antfu.me ArtDots.vue（SCALE/LENGTH/SPACING + 3D simplex），
 * 用 canvas 近似 ParticleContainer，避免 pixi 体积与非 dots 页下载。
 * simplex3D 改编自 Jonas Wagner simplex-noise (MIT)。
 */

(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.getElementById('dots-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  var SCALE = 200;
  var LENGTH = 8;
  var BASE_SPACING = 15;
  var DOT_COLOR = '204,204,204'; /* 0xCCCCCC */
  var TARGET_FPS = 30;
  var FRAME_MS = 1000 / TARGET_FPS;

  /* --- compact 3D simplex --- */
  var F3 = 1 / 3;
  var G3 = 1 / 6;
  var grad3 = new Float64Array([
    1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
    1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
    0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1
  ]);

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
    var perm = new Uint8Array(512);
    var permMod12 = new Uint8Array(512);
    for (i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
      permMod12[i] = perm[i] % 12;
    }
    return { perm: perm, permMod12: permMod12 };
  }

  var tables = buildPerm();
  var perm = tables.perm;
  var permMod12 = tables.permMod12;

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

  function getForceOnPoint(x, y, z) {
    return (noise3D(x / SCALE, y / SCALE, z) - 0.5) * 2 * Math.PI;
  }

  var points = [];
  var existing = Object.create(null);
  var w = 0;
  var h = 0;
  var spacing = BASE_SPACING;
  var rafId = 0;
  var lastFrame = 0;
  var running = true;

  function pickSpacing(width) {
    if (width < 500) return 24;
    if (width < 900) return 20;
    return BASE_SPACING;
  }

  function addPoints() {
    var x, y, id;
    for (x = -spacing / 2; x < w + spacing; x += spacing) {
      for (y = -spacing / 2; y < h + spacing; y += spacing) {
        id = x + '-' + y;
        if (existing[id]) continue;
        existing[id] = 1;
        points.push({
          x: x,
          y: y,
          opacity: Math.random() * 0.5 + 0.5
        });
      }
    }
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    spacing = pickSpacing(w);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    points.length = 0;
    existing = Object.create(null);
    addPoints();
  }

  function draw(now) {
    if (!running) return;
    rafId = requestAnimationFrame(draw);
    if (now - lastFrame < FRAME_MS) return;
    lastFrame = now;

    var t = Date.now() / 7500;
    ctx.clearRect(0, 0, w, h);

    var i, p, rad, len, nx, ny, alpha;
    for (i = 0; i < points.length; i++) {
      p = points[i];
      rad = getForceOnPoint(p.x, p.y, t);
      len = (noise3D(p.x / SCALE, p.y / SCALE, t * 2) + 0.5) * LENGTH;
      nx = p.x + Math.cos(rad) * len;
      ny = p.y + Math.sin(rad) * len;
      alpha = (Math.abs(Math.cos(rad)) * 0.9 + 0.1) * p.opacity;
      ctx.fillStyle = 'rgba(' + DOT_COLOR + ',' + alpha + ')';
      /* 2×2 rect ≈ r=1 circle; cheaper than arc per particle */
      ctx.fillRect(nx - 1, ny - 1, 2, 2);
    }
  }

  resize();
  rafId = requestAnimationFrame(draw);

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 250);
  });

  /* stop if decoration host is removed (defensive; SPA-less Hugo) */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    } else if (!running) {
      running = true;
      lastFrame = 0;
      rafId = requestAnimationFrame(draw);
    }
  });
})();
