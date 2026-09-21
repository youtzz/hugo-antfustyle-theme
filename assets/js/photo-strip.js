(function () {
  'use strict';

  document.querySelectorAll('.photo-strip').forEach(function (strip) {
    strip.addEventListener('wheel', function (event) {
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;

      var maxScroll = strip.scrollWidth - strip.clientWidth;
      var atStart = strip.scrollLeft <= 0;
      var atEnd = strip.scrollLeft >= maxScroll - 1;

      if ((event.deltaY < 0 && atStart) || (event.deltaY > 0 && atEnd)) return;

      strip.scrollLeft += event.deltaY;
      event.preventDefault();
    }, { passive: false });
  });
})();
