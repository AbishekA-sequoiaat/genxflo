/*
 * research-teams.js — "Built for Modern Research Teams" orbit: six team nodes around a hub, a radar sweep, auto-advancing
 * (paused on hover / focus / off screen). Click or use the arrow keys to pick a team.
 */
(function () {
  'use strict';
  var root = document.querySelector('[data-ro]');
  if (!root) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nodes = [].slice.call(root.querySelectorAll('[data-ro-tab]'));
  var panels = [].slice.call(root.querySelectorAll('[data-ro-p]'));
  var lines = [].slice.call(root.querySelectorAll('[data-ro-l]'));
  var count = root.querySelector('[data-ro-i]');
  var sweep = root.querySelector('.ro-sweep');
  var cur = 0, timer = 0, hold = false, visible = false;
  function plan() { clearTimeout(timer); if (reduce || hold || !visible) return; timer = setTimeout(function () { show(cur + 1); }, 5200); }
  function show(i, focus) {
    cur = (i + nodes.length) % nodes.length;
    nodes.forEach(function (n, k) { var on = k === cur; n.classList.toggle('is-on', on); n.setAttribute('aria-selected', String(on)); n.tabIndex = on ? 0 : -1; });
    panels.forEach(function (p, k) { p.classList.toggle('is-on', k === cur); });
    lines.forEach(function (l, k) { l.classList.toggle('is-on', k === cur); });
    count.textContent = '0' + (cur + 1);
    sweep.style.setProperty('--a', (cur * 60) + 'deg');
    if (focus) nodes[cur].focus();
    plan();
  }
  nodes.forEach(function (n, k) {
    n.addEventListener('click', function () { show(k); });
    n.addEventListener('keydown', function (e) {
      var s = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!s) return; e.preventDefault(); show(cur + s, true);
    });
  });
  var pv = root.querySelector('[data-ro-prev]'), nx = root.querySelector('[data-ro-next]');
  if (pv) pv.addEventListener('click', function () { show(cur - 1); });
  if (nx) nx.addEventListener('click', function () { show(cur + 1); });
  root.addEventListener('pointerenter', function () { hold = true; clearTimeout(timer); });
  root.addEventListener('pointerleave', function () { hold = false; plan(); });
  root.addEventListener('focusin', function () { hold = true; clearTimeout(timer); });
  root.addEventListener('focusout', function () { hold = false; plan(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; root.classList.toggle('is-off', !visible); if (visible) plan(); else clearTimeout(timer); }, { threshold: 0.3 }).observe(root);
  } else visible = true;
  show(0);
})();
