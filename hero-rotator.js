/*
 * HeroRotator — auto-advancing sub-heading carousel with clickable dots.
 * Markup: [data-rot] > [data-rot-slide]... and [data-rot-dot]...
 * It pauses while the pointer or focus is inside, and while the tab is hidden.
 */
(function () {
  'use strict';

  function Rotator(root) {
    var slides = [].slice.call(root.querySelectorAll('[data-rot-slide]'));
    var dots = [].slice.call(root.querySelectorAll('[data-rot-dot]'));
    if (slides.length < 2) return;
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var current = 0;
    var timer = 0;
    var DELAY = 5200;

    function show(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        var on = i === current;
        slide.classList.toggle('is-on', on);
        slide.setAttribute('aria-hidden', String(!on));
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle('is-on', i === current);
        dot.setAttribute('aria-current', i === current ? 'true' : 'false');
      });
    }

    function stop() { clearInterval(timer); timer = 0; }
    function start() {
      stop();
      if (!reduce && !document.hidden) timer = setInterval(function () { show(current + 1); }, DELAY);
    }

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { show(i); start(); });
    });
    root.addEventListener('pointerenter', stop);
    root.addEventListener('pointerleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });

    show(0);
    start();
  }

  function init() { document.querySelectorAll('[data-rot]').forEach(Rotator); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
