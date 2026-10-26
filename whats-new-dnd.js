/*
 * whats-new-dnd.js — "What's New" cards as a drag-and-drop node canvas, like the GenXflo pipeline builder.
 *   <div data-dd data-edges="0-1,0-2,..">  <svg class="dd-lines"> + <article data-dd-node data-x="%" data-y="px">
 * Nodes can be dragged (or moved with the arrow keys); the connections follow. Below 850px it stays a plain list.
 */
(function () {
  'use strict';
  var root = document.querySelector('[data-dd]');
  if (!root) return;
  var INTERACTIVE = false;   // dragging, keyboard moves, Reset and the cursor "Drag" badge are switched off for now (set to true to bring them back)
  var NS = 'http://www.w3.org/2000/svg';
  var svg = root.querySelector('.dd-lines');
  var nodes = [].slice.call(root.querySelectorAll('[data-dd-node]'));
  var edges = (root.getAttribute('data-edges') || '').split(',').map(function (s) { var p = s.split('-'); return [+p[0], +p[1]]; });
  var list = window.matchMedia ? window.matchMedia('(max-width: 850px)') : { matches: false };
  var start = nodes.map(function (n) { return { x: +n.getAttribute('data-x') / 100, y: +n.getAttribute('data-y') }; });
  var pos = start.map(function (p) { return { x: p.x, y: p.y }; });   // x as a fraction of the canvas width, y in px
  var paths = [];

  edges.forEach(function () {
    var base = document.createElementNS(NS, 'path'), flow = document.createElementNS(NS, 'path');
    base.setAttribute('class', 'dd-edge'); flow.setAttribute('class', 'dd-flow');
    svg.appendChild(base); svg.appendChild(flow); paths.push([base, flow]);
  });

  function place() {
    var W = root.clientWidth;
    nodes.forEach(function (n, i) {
      if (list.matches) { n.style.left = n.style.top = ''; return; }
      n.style.left = Math.round(pos[i].x * W) + 'px';
      n.style.top = Math.round(pos[i].y) + 'px';
    });
    draw();
  }
  function port(n, side) {
    var port = n.querySelector('.dd-port--' + side);
    return { x: n.offsetLeft + (side === 'out' ? n.offsetWidth : 0), y: n.offsetTop + n.offsetHeight / 2 };
  }
  function draw() {
    svg.style.display = list.matches ? 'none' : '';
    if (list.matches) return;
    svg.setAttribute('width', root.clientWidth); svg.setAttribute('height', root.clientHeight);
    edges.forEach(function (e, i) {
      var a = port(nodes[e[0]], 'out'), b = port(nodes[e[1]], 'in');
      var dx = Math.max(60, Math.abs(b.x - a.x) * 0.5);
      var d = 'M' + a.x + ' ' + a.y + ' C' + (a.x + dx) + ' ' + a.y + ' ' + (b.x - dx) + ' ' + b.y + ' ' + b.x + ' ' + b.y;
      paths[i][0].setAttribute('d', d); paths[i][1].setAttribute('d', d);
    });
  }
  function clampPos(i) {
    var n = nodes[i], W = root.clientWidth, H = root.clientHeight;
    pos[i].x = Math.min(Math.max(pos[i].x, 0), (W - n.offsetWidth) / W);
    pos[i].y = Math.min(Math.max(pos[i].y, 52), H - n.offsetHeight);
  }

  var z = 2;
  nodes.forEach(function (n, i) {
    if (!INTERACTIVE) return;
    var drag = null;
    n.addEventListener('pointerdown', function (e) {
      if (list.matches || (e.button !== undefined && e.button !== 0)) return;
      drag = { px: e.clientX, py: e.clientY, x: pos[i].x, y: pos[i].y };
      n.setPointerCapture(e.pointerId);
      n.style.zIndex = ++z; n.classList.add('is-drag'); root.classList.add('is-dragging');
      e.preventDefault();
    });
    n.addEventListener('pointermove', function (e) {
      if (!drag) return;
      pos[i].x = drag.x + (e.clientX - drag.px) / root.clientWidth;
      pos[i].y = drag.y + (e.clientY - drag.py);
      clampPos(i); place();
    });
    function end() { if (!drag) return; drag = null; n.classList.remove('is-drag'); root.classList.remove('is-dragging'); }
    n.addEventListener('pointerup', end); n.addEventListener('pointercancel', end);
    n.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 40 : 14, W = root.clientWidth, m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!m || list.matches) return;
      e.preventDefault();
      pos[i].x += m[0] * step / W; pos[i].y += m[1] * step; clampPos(i); place();
    });
  });

  var reset = root.querySelector('[data-dd-reset]');
  if (reset && INTERACTIVE) reset.addEventListener('click', function () {
    pos = start.map(function (p) { return { x: p.x, y: p.y }; });
    root.classList.add('is-reset'); place();
    setTimeout(function () { root.classList.remove('is-reset'); }, 500);
  });

  if ('ResizeObserver' in window) new ResizeObserver(function () { nodes.forEach(function (_, i) { clampPos(i); }); place(); }).observe(root);
  else window.addEventListener('resize', place);
  if (list.addEventListener) list.addEventListener('change', place);
  window.addEventListener('load', place);
  place();

  // cursor-following "Drag" badge (mouse only)
  if (INTERACTIVE && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var badge = document.createElement('div');
    badge.className = 'dd-cursor'; badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = '<i class="ph-bold ph-arrows-left-right"></i>Drag';
    document.body.appendChild(badge);
    function show(on) { badge.classList.toggle('is-on', on); }
    root.addEventListener('pointermove', function (e) {
      if (list.matches) return;
      badge.style.transform = 'translate3d(' + (e.clientX + 16) + 'px,' + (e.clientY + 16) + 'px,0)';
      show(!e.target.closest('.dd-reset'));
    });
    root.addEventListener('pointerleave', function () { show(false); });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { root.classList.toggle('is-idle', !en.some(function (e) { return e.isIntersecting; })); }).observe(root);
  }
})();
