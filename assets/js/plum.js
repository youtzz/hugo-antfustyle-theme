/* hugo-antfustyle-theme — ArtPlum 程序化装饰
 * 移植自 antfu.me 的 src/components/ArtPlum.vue
 * 用 L-system 算法在 canvas 上随机生成羽毛/枝叶装饰图
 */

(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.getElementById('plum-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var r180 = Math.PI;
  var r90 = Math.PI / 2;
  var r15 = Math.PI / 12;
  var MIN_BRANCH = 30;
  var len = 6;
  var MAX_DEPTH = 80;
  var MAX_FRAMES = 60;
  var COLOR = '#88888825';

  var steps = [];
  var prevSteps = [];

  function polar2cart(x, y, r, theta) {
    return [x + r * Math.cos(theta), y + r * Math.sin(theta)];
  }

  function step(x, y, rad, counter, depth) {
    if (depth > MAX_DEPTH) return;
    var length = Math.random() * len;
    counter.value += 1;
    var nx = x + length * Math.cos(rad);
    var ny = y + length * Math.sin(rad);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    var rad1 = rad + Math.random() * r15;
    var rad2 = rad - Math.random() * r15;

    if (nx < -100 || nx > canvas._w + 100 || ny < -100 || ny > canvas._h + 100) return;

    var rate = counter.value <= MIN_BRANCH ? 0.8 : 0.5;
    if (Math.random() < rate) steps.push([nx, ny, rad1, counter, depth + 1]);
    if (Math.random() < rate) steps.push([nx, ny, rad2, counter, depth + 1]);
  }

  function render() {
    var dpr = window.devicePixelRatio || 1;
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas._w = w;
    canvas._h = h;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = dpr * w;
    canvas.height = dpr * h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.lineWidth = 1;
    ctx.strokeStyle = COLOR;
    steps = [];

    var randomMiddle = function () { return Math.random() * 0.6 + 0.2; };
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
      if (frameCount++ > MAX_FRAMES || steps.length === 0) return;
      prevSteps = steps;
      steps = [];
      prevSteps.forEach(function (s) {
        if (Math.random() < 0.5) {
          steps.push(s);
        } else {
          step(s[0], s[1], s[2], s[3], s[4]);
        }
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  render();

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      render();
    }, 250);
  });
})();
