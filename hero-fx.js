/*
 * hero-fx.js — the immersive Version 2 hero.
 * Staggered headline reveal once the loader is gone, a cursor spotlight, a gentle 3D tilt of the product video,
 * depth parallax on the chips and cards, floating dust, and everything pauses while the hero is off screen.
 */
(function () {
  'use strict';
  var hx = document.querySelector('[data-hx]');
  if (!hx) return;
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  var wide = window.matchMedia && window.matchMedia('(min-width: 901px)').matches;

  // headline and layers appear after the loading screen opens
  function start() { hx.classList.add('is-in'); }
  if (!root.classList.contains('is-loading')) start();
  else {
    var mo = new MutationObserver(function () { if (!root.classList.contains('is-loading')) { mo.disconnect(); start(); } });
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    setTimeout(start, 9000);
  }

  // floating dust
  var dust = null;
  var count = window.GX_LOW ? 14 : 30;
  if (dust && !reduce) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var d = document.createElement('i');
      var s = 2 + Math.random() * 4;
      d.style.cssText = 'left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) + '%;--s:' + s.toFixed(1) + 'px;--o:' + (0.18 + Math.random() * 0.5).toFixed(2) + ';--d:' + (6 + Math.random() * 8).toFixed(1) + 's;--l:-' + (Math.random() * 8).toFixed(1) + 's';
      frag.appendChild(d);
    }
    dust.appendChild(frag);
  }

  // pause every animation when the hero is not on screen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { hx.classList.toggle('is-off', !e[0].isIntersecting); }, { threshold: 0 }).observe(hx);
  }

  if (reduce || !fine || !wide) return;

  // pointer: spotlight, tilt, parallax (one rAF per frame at most)
  var tilt = hx.querySelector('[data-hx-tilt] .vs-device');
  var layers = [].slice.call(hx.querySelectorAll('[data-depth]'));
  var nx = 0, ny = 0, px = 0.5, py = 0.4, queued = false;
  function paint() {
    queued = false;
    hx.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    hx.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    if (tilt) {
      tilt.style.setProperty('--ry', (nx * 5).toFixed(2) + 'deg');
      tilt.style.setProperty('--rx', (-ny * 4).toFixed(2) + 'deg');
    }
    layers.forEach(function (l) {
      var k = +l.getAttribute('data-depth');
      l.style.translate = (nx * k).toFixed(1) + 'px ' + (ny * k * 0.7).toFixed(1) + 'px';
    });
  }
  hx.addEventListener('pointermove', function (e) {
    var r = hx.getBoundingClientRect();
    px = (e.clientX - r.left) / r.width;
    py = (e.clientY - r.top) / r.height;
    nx = px * 2 - 1;
    ny = py * 2 - 1;
    if (!queued) { queued = true; requestAnimationFrame(paint); }
  }, { passive: true });
  hx.addEventListener('pointerleave', function () { nx = 0; ny = 0; px = 0.5; py = 0.4; if (!queued) { queued = true; requestAnimationFrame(paint); } });
})();
