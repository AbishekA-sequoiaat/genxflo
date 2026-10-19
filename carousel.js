/*
 * Carousel — left/right buttons, drag, keyboard and snap scrolling for [data-cx] sections.
 * The slides sit in a horizontally scrollable viewport; the buttons move by one slide.
 */
(function () {
  'use strict';

  function Carousel(root) {
    var view = root.querySelector('[data-cx-viewport]');
    var prev = root.querySelector('[data-cx-prev]');
    var next = root.querySelector('[data-cx-next]');
    var slides = [].slice.call(root.querySelectorAll('.cx-slide'));
    if (!view || !slides.length) return;
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    function step() {
      return slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : view.clientWidth;
    }

    function go(dir) {
      view.scrollTo({ left: view.scrollLeft + dir * step(), behavior: reduce ? 'auto' : 'smooth' });
    }

    function update() {
      var max = view.scrollWidth - view.clientWidth - 2;
      if (prev) prev.disabled = view.scrollLeft <= 2;
      if (next) next.disabled = view.scrollLeft >= max;
    }

    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    view.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    view.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });

    // mouse drag (touch already scrolls natively)
    var down = null;
    view.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = { x: e.clientX, left: view.scrollLeft, moved: false };
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - down.x;
      if (!down.moved && Math.abs(dx) > 5) { down.moved = true; view.classList.add('is-dragging'); }
      if (down.moved) view.scrollLeft = down.left - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      var moved = down.moved;
      down = null;
      view.classList.remove('is-dragging');
      if (moved) {
        // settle onto the nearest slide
        var target = Math.round(view.scrollLeft / step()) * step();
        view.scrollTo({ left: target, behavior: reduce ? 'auto' : 'smooth' });
      }
    });

    update();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
  }

  function init() { document.querySelectorAll('[data-cx]').forEach(Carousel); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
