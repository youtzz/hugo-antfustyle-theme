/* antpress — 拈花微笑
 * 点击手中莲蕾：花开 → 淡出「拈花一笑」
 */

(function () {
  'use strict';

  var root = document.querySelector('.nianhua');
  if (!root) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var blooming = false;

  function bloom() {
    if (blooming) return;
    blooming = true;
    root.classList.add('is-blooming');
    root.setAttribute('aria-pressed', 'true');

    if (reduced) {
      root.classList.add('is-smiling');
      return;
    }

    window.setTimeout(function () {
      root.classList.add('is-smiling');
    }, 700);
  }

  root.addEventListener('click', bloom);
  root.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      bloom();
    }
  });
})();
