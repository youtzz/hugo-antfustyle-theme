/* hugo-antfustyle-theme — 主题切换 + 滚动到顶部 */

(function () {
  'use strict';

  /* iOS Safari: enable CSS :active on touch (WebKit requires a touchstart listener) */
  document.addEventListener('touchstart', function () {}, { passive: true });

  /* ============================
   * 主题切换（VueUse useDark 语义 + 圆环扩散动画）
   * storage: light/dark = 锁定；auto / 空 / 非法 = 跟随系统
   * 切换到与当前系统相同的外观时写回 auto（软覆盖，之后继续跟系统）
   * ============================ */
  var STORAGE_KEY = 'hugo-antfustyle-theme-theme';
  var colorScheme = window.matchMedia('(prefers-color-scheme: dark)');

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function isExplicit(value) {
    return value === 'dark' || value === 'light';
  }

  function systemTheme() {
    return colorScheme.matches ? 'dark' : 'light';
  }

  function resolveTheme(stored) {
    return isExplicit(stored) ? stored : systemTheme();
  }

  function readStored() {
    return localStorage.getItem(STORAGE_KEY);
  }

  setTheme(resolveTheme(readStored()));

  colorScheme.addEventListener('change', function (event) {
    if (!isExplicit(readStored())) {
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
        /* VueUse useDark: match system → store auto; differ → lock light/dark */
        localStorage.setItem(STORAGE_KEY, next === systemTheme() ? 'auto' : next);
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
