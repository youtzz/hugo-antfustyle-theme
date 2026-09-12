/* antpress — 主题切换 + 滚动到顶部 */

(function () {
  'use strict';

  /* ============================
   * 主题切换（跟随系统 + 用户偏好持久化 + 圆环扩散动画）
   * ============================ */
  var STORAGE_KEY = 'antpress-theme';
  var saved = localStorage.getItem(STORAGE_KEY);
  var colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
  var hasSavedTheme = saved === 'dark' || saved === 'light';

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  setTheme(hasSavedTheme ? saved : (colorScheme.matches ? 'dark' : 'light'));

  colorScheme.addEventListener('change', function (event) {
    if (!hasSavedTheme) {
      setTheme(event.matches ? 'dark' : 'light');
    }
  });

  var btn = document.querySelector('.theme-toggle');
  if (btn) {
    btn.addEventListener('click', function (event) {
      var cur = document.documentElement.getAttribute('data-theme');
      var next = cur === 'dark' ? 'light' : 'dark';
      var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      function applyTheme() {
        setTheme(next);
        localStorage.setItem(STORAGE_KEY, next);
        hasSavedTheme = true;
      }

      if (!document.startViewTransition || prefersReducedMotion) {
        applyTheme();
        return;
      }

      var rect = btn.getBoundingClientRect();
      var x = event.detail === 0 ? rect.left + rect.width / 2 : event.clientX;
      var y = event.detail === 0 ? rect.top + rect.height / 2 : event.clientY;
      var radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );
      var transition = document.startViewTransition(applyTheme);

      transition.ready.then(function () {
        var clipPath = [
          'circle(0 at ' + x + 'px ' + y + 'px)',
          'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'
        ];
        document.documentElement.animate(
          {
            clipPath: next === 'dark' ? clipPath.reverse() : clipPath
          },
          {
            duration: 400,
            easing: 'ease-out',
            fill: 'forwards',
            pseudoElement: next === 'dark'
              ? '::view-transition-old(root)'
              : '::view-transition-new(root)'
          }
        );
      });
    });
  }

  /* ============================
   * 滚动到顶部按钮
   * ============================ */
  var toTop = document.querySelector('.to-top');
  if (toTop) {
    var visible = false;
    window.addEventListener('scroll', function () {
      var shouldShow = window.scrollY > 300;
      if (shouldShow !== visible) {
        visible = shouldShow;
        toTop.classList.toggle('visible', shouldShow);
      }
    });
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

})();
