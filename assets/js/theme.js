/* antpress — 主题切换 + 中文标签 + 滚动到顶部 */

(function () {
  'use strict';

  /* ============================
   * 暗色切换（prefers-color-scheme + localStorage）
   * ============================ */
  var STORAGE_KEY = 'antpress-theme';
  var saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') {
    document.documentElement.setAttribute('data-theme', saved);
  }

  var btn = document.querySelector('.theme-toggle');
  if (btn) {
    btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      if (!cur) {
        cur = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEY, next);
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

  /* ============================
   * 中文标签自动添加（antfu 风）
   * 检测标题含 CJK 字符时显示「中文」小标签
   * ============================ */
  function addLangTags() {
    var items = document.querySelectorAll('.archive-list li');
    items.forEach(function (li) {
      var titleEl = li.querySelector('.archive-title');
      if (!titleEl) return;
      if (li.querySelector('.lang-tag')) return;
      var text = titleEl.textContent || '';
      if (/[一-鿿]/.test(text)) {
        var tag = document.createElement('span');
        tag.className = 'lang-tag';
        tag.textContent = '中文';
        li.insertBefore(tag, titleEl);
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addLangTags);
  } else {
    addLangTags();
  }
})();