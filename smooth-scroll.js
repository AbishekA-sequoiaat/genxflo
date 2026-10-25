/*
 * smooth-scroll.js — inertial smooth scrolling (Lenis). Skipped for reduced-motion users and touch devices,
 * which already scroll smoothly. Anchor links glide to their target.
 */
(function () {
  'use strict';
  if (!window.Lenis) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

  var lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, anchors: true });
  window.gxLenis = lenis;
  function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
  document.documentElement.classList.add('lenis');
})();
