/*
 * perf.js — small runtime helpers that keep the home pages smooth.
 *  - flags low-power devices (few cores, little memory, data saver) as html[data-perf="low"] and window.GX_LOW
 *  - marks sections that are off screen with [data-offscreen] so CSS animations inside them pause
 *  - pauses autoplaying videos while they are off screen or the tab is hidden
 * Load it first (deferred) so the other scripts can read window.GX_LOW.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var cores = navigator.hardwareConcurrency || 8;
  var memory = navigator.deviceMemory || 8;
  var connection = navigator.connection || {};
  var low = cores <= 4 || memory <= 4 || !!connection.saveData;
  window.GX_LOW = low;
  root.setAttribute('data-perf', low ? 'low' : 'high');

  function init() {
    if (!('IntersectionObserver' in window)) return;

    var sections = document.querySelectorAll('main > section, #site-footer');
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.removeAttribute('data-offscreen');
        else entry.target.setAttribute('data-offscreen', '');
      });
    }, { rootMargin: '160px 0px' });
    [].forEach.call(sections, function (section) { sectionObserver.observe(section); });

    var videos = [].slice.call(document.querySelectorAll('video[autoplay]'));
    if (!videos.length) return;

    function park(video) {
      if (!video.paused) { video.dataset.autoParked = '1'; video.pause(); }
    }
    function resume(video) {
      if (video.dataset.autoParked === '1') {
        delete video.dataset.autoParked;
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      }
    }

    var onScreen = new WeakMap();
    var videoObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        onScreen.set(entry.target, entry.isIntersecting);
        if (entry.isIntersecting && !document.hidden) resume(entry.target);
        else park(entry.target);
      });
    }, { threshold: 0.05 });
    videos.forEach(function (video) { videoObserver.observe(video); });

    document.addEventListener('visibilitychange', function () {
      videos.forEach(function (video) {
        if (document.hidden) park(video);
        else if (onScreen.get(video)) resume(video);
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
