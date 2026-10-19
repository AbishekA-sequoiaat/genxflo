/*
 * TeamLine — the "research teams" pipeline line. Pick a stop (or let it autoplay) and the
 * glowing progress line runs to it while that team's panel and mini pipeline swap in.
 * Used by every [data-tl] section.
 */
(function () {
  'use strict';

  function TeamLine(root) {
    var tabs = [].slice.call(root.querySelectorAll('[data-tl-tab]'));
    var panels = [].slice.call(root.querySelectorAll('[data-tl-panel]'));
    var fill = root.querySelector('[data-tl-fill]');
    if (!tabs.length || tabs.length !== panels.length) return;
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var current = 0;
    var timer = 0;
    var autoplay = !reduce;
    var DELAY = 6500;

    function select(index, focus) {
      current = (index + tabs.length) % tabs.length;
      tabs.forEach(function (tab, i) {
        var on = i === current;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
      });
      if (fill) fill.style.width = (tabs.length > 1 ? (current / (tabs.length - 1)) * 100 : 0) + '%';
      if (focus) tabs[current].focus();
    }

    function stop() { clearInterval(timer); timer = 0; }
    function start() {
      stop();
      if (autoplay) timer = setInterval(function () { select(current + 1); }, DELAY);
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { autoplay = false; stop(); select(i); });
      tab.addEventListener('keydown', function (e) {
        var step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (step) { e.preventDefault(); autoplay = false; stop(); select(current + step, true); }
      });
    });

    root.addEventListener('pointerenter', stop);
    root.addEventListener('pointerleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);

    // only advance while the section is on screen
    var visible = true;
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        visible = entries.some(function (e) { return e.isIntersecting; });
        if (visible) start(); else stop();
      }).observe(root);
    }

    select(0);
    start();
  }

  function init() { document.querySelectorAll('[data-tl]').forEach(TeamLine); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
