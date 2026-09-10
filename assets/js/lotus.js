/* antpress — Lotus 程序化装饰
 * 莲花生长：茎 → 叶 → 花瓣展开
 * 印刷感淡墨，气质对齐 ArtPlum
 */

(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.getElementById('lotus-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var MAX_FRAMES = 120;
  var PETAL_COUNT = 8;
  var LEAF_COUNT = 3;

  var frame = 0;
  var animId = 0;
  var seed = Math.random();

  function rnd(a, b) {
    seed = (seed * 16807) % 2147483647;
    var t = (seed - 1) / 2147483646;
    return a + (b - a) * t;
  }

  function palette() {
    var theme = document.documentElement.getAttribute('data-theme');
    var dark = theme === 'dark' ||
      (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) {
      return {
        stem: 'rgba(180,180,180,0.22)',
        leaf: 'rgba(140,160,140,0.18)',
        petal: 'rgba(210,170,170,0.28)',
        tip: 'rgba(220,190,190,0.45)',
        water: 'rgba(150,160,170,0.12)'
      };
    }
    return {
      stem: 'rgba(90,90,90,0.28)',
      leaf: 'rgba(90,110,90,0.2)',
      petal: 'rgba(140,100,100,0.28)',
      tip: 'rgba(120,80,80,0.4)',
      water: 'rgba(100,110,120,0.12)'
    };
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function clamp01(t) {
    return Math.max(0, Math.min(1, t));
  }

  function drawStem(cx, baseY, topY, progress, colors) {
    var h = (baseY - topY) * progress;
    var sway = Math.sin(frame * 0.03) * 4 * progress;
    ctx.beginPath();
    ctx.strokeStyle = colors.stem;
    ctx.lineWidth = 1.2;
    ctx.moveTo(cx, baseY);
    ctx.quadraticCurveTo(cx + sway * 0.6, baseY - h * 0.5, cx + sway, baseY - h);
    ctx.stroke();
    return { x: cx + sway, y: baseY - h };
  }

  function drawLeaf(originX, originY, side, size, progress, colors) {
    var p = easeOutCubic(progress);
    if (p <= 0) return;
    var angle = side * (0.85 + rnd(0, 0.2));
    var len = size * p;
    var tipX = originX + Math.cos(angle) * len;
    var tipY = originY + Math.sin(angle) * len * 0.55 - len * 0.15;
    var ctrl1X = originX + Math.cos(angle - 0.4) * len * 0.55;
    var ctrl1Y = originY - len * 0.25;
    var ctrl2X = originX + Math.cos(angle + 0.4) * len * 0.55;
    var ctrl2Y = originY + len * 0.1;

    ctx.beginPath();
    ctx.fillStyle = colors.leaf;
    ctx.strokeStyle = colors.stem;
    ctx.lineWidth = 0.8;
    ctx.moveTo(originX, originY);
    ctx.quadraticCurveTo(ctrl1X, ctrl1Y, tipX, tipY);
    ctx.quadraticCurveTo(ctrl2X, ctrl2Y, originX, originY);
    ctx.fill();
    ctx.stroke();
  }

  function petalPath(cx, cy, r, i, open, wobble) {
    var a0 = (-Math.PI / 2) + (i / PETAL_COUNT) * Math.PI * 2 + wobble;
    var a1 = a0 + (Math.PI * 2) / PETAL_COUNT;
    var mid = (a0 + a1) / 2;
    var outer = r * (0.85 + 0.2 * open);
    var inner = r * 0.22;
    var tipX = cx + Math.cos(mid) * outer;
    var tipY = cy + Math.sin(mid) * outer * 0.92;
    var p0x = cx + Math.cos(a0) * inner;
    var p0y = cy + Math.sin(a0) * inner;
    var p1x = cx + Math.cos(a1) * inner;
    var p1y = cy + Math.sin(a1) * inner;
    var c0x = cx + Math.cos(a0 + 0.15) * outer * 0.72;
    var c0y = cy + Math.sin(a0 + 0.15) * outer * 0.72;
    var c1x = cx + Math.cos(a1 - 0.15) * outer * 0.72;
    var c1y = cy + Math.sin(a1 - 0.15) * outer * 0.72;

    ctx.moveTo(p0x, p0y);
    ctx.quadraticCurveTo(c0x, c0y, tipX, tipY);
    ctx.quadraticCurveTo(c1x, c1y, p1x, p1y);
  }

  function drawLotus(cx, cy, size, progress, colors) {
    var open = easeOutCubic(clamp01((progress - 0.15) / 0.85));
    if (open <= 0.01) {
      ctx.beginPath();
      ctx.fillStyle = colors.petal;
      ctx.ellipse(cx, cy, size * 0.18 * progress, size * 0.28 * progress, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    var wobble = Math.sin(frame * 0.02) * 0.03;
    var r = size * (0.55 + 0.45 * open);

    for (var layer = 0; layer < 2; layer++) {
      var scale = layer === 0 ? 1 : 0.72;
      ctx.beginPath();
      ctx.fillStyle = colors.petal;
      ctx.strokeStyle = colors.tip;
      ctx.lineWidth = 0.7;
      for (var i = 0; i < PETAL_COUNT; i++) {
        petalPath(cx, cy, r * scale, i + layer * 0.5, open, wobble);
      }
      ctx.fill();
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.fillStyle = colors.tip;
    ctx.arc(cx, cy, size * 0.12 * open, 0, Math.PI * 2);
    ctx.fill();

    for (var d = 0; d < 6; d++) {
      var ang = (d / 6) * Math.PI * 2 + frame * 0.01;
      var dx = Math.cos(ang) * size * 0.06;
      var dy = Math.sin(ang) * size * 0.06;
      ctx.beginPath();
      ctx.fillStyle = colors.stem;
      ctx.arc(cx + dx, cy + dy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWater(cx, baseY, progress, colors) {
    var p = easeOutCubic(clamp01(progress));
    if (p <= 0) return;
    ctx.strokeStyle = colors.water;
    ctx.lineWidth = 1;
    for (var i = 0; i < 3; i++) {
      var w = (40 + i * 28) * p;
      var y = baseY + 6 + i * 5;
      ctx.beginPath();
      ctx.ellipse(cx, y, w, 4 + i, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function paint() {
    var dpr = window.devicePixelRatio || 1;
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = dpr * w;
    canvas.height = dpr * h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var colors = palette();
    var t = clamp01(frame / MAX_FRAMES);

    /* 两侧各一丛，窄屏只保留一侧 */
    var plants = w < 640
      ? [{ x: w * 0.18, base: h * 0.92, scale: 0.85, phase: 0 }]
      : [
          { x: w * 0.12, base: h * 0.9, scale: 1, phase: 0 },
          { x: w * 0.88, base: h * 0.88, scale: 0.78, phase: 0.12 }
        ];

    plants.forEach(function (plant) {
      seed = 0.3 + plant.x * 0.001;
      var localT = clamp01((t - plant.phase) / (1 - plant.phase * 0.5));
      var stemProgress = clamp01(localT / 0.45);
      var leafProgress = clamp01((localT - 0.25) / 0.35);
      var flowerProgress = clamp01((localT - 0.45) / 0.55);
      var stemH = Math.min(h * 0.42, 320) * plant.scale;
      var tip = drawStem(plant.x, plant.base, plant.base - stemH, stemProgress, colors);

      for (var i = 0; i < LEAF_COUNT; i++) {
        var along = 0.35 + i * 0.18;
        var lx = plant.x + (tip.x - plant.x) * along;
        var ly = plant.base + (tip.y - plant.base) * along;
        var side = (i % 2 === 0 ? -1 : 1) * (i === 2 ? -1 : 1);
        var size = (55 + i * 12) * plant.scale;
        drawLeaf(lx, ly, side > 0 ? -0.3 : Math.PI + 0.3, size, leafProgress * (1 - i * 0.12), colors);
      }

      drawLotus(tip.x, tip.y - 8 * plant.scale, 48 * plant.scale, flowerProgress, colors);
      drawWater(plant.x, plant.base, clamp01(localT / 0.3), colors);
    });
  }

  function tick() {
    paint();
    frame += 1;
    if (frame <= MAX_FRAMES + 40) {
      animId = requestAnimationFrame(tick);
    }
  }

  function start() {
    cancelAnimationFrame(animId);
    frame = 0;
    seed = Math.random() * 1000 + 1;
    tick();
  }

  start();

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(start, 250);
  });

  /* 主题切换时重绘配色 */
  var obs = new MutationObserver(function () { paint(); });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
