/*
 * lazy-modules.js — loads the heavy 3D modules only when their section is about to scroll into view,
 * so the first paint is not competing with WebGL set-up that nobody can see yet.
 *   dna.js → [data-dna], why-cube.js → [data-cube], crystal-ball.js → [data-crystal-ball]
 * (lanyard.js sits in the hero and still loads straight away.)
 */
(function () {
  'use strict';
  var jobs = [
    ['[data-dna]', 'dna.js?v=2'],
    ['#why-genxflo', 'why-cube.js'],
    ['[data-crystal-ball]', 'crystal-ball.js']
  ];
  function load(src) {
    import('./' + src).catch(function (e) {
      document.documentElement.classList.remove('wy-js');   // never leave the Why cards hidden if a module fails
      if (window.console) console.warn('module failed', src, e);
    });
  }
  jobs.forEach(function (job) {
    var el = document.querySelector(job[0]);
    if (!el) return;
    if (!('IntersectionObserver' in window)) { load(job[1]); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); load(job[1]); }
    }, { rootMargin: '1400px 0px' });
    io.observe(el);
  });
})();
