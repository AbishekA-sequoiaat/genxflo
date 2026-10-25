/*
 * team-graph.js — "Built for Modern Research Teams" node diagram.
 * Cards (nodes) expand downward when clicked, and animated dotted lines connect them.
 * The lines are redrawn whenever a card changes size (expanding pushes the cards below it down).
 *   <div data-team-graph> <svg class="tg-lines"></svg> <article class="tg-node tg-n1" data-tg-node>… </div>
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var root = document.querySelector('[data-team-graph]');
  if (!root) return;
  var svg = root.querySelector('.tg-lines');
  var nodes = [].slice.call(root.querySelectorAll('[data-tg-node]'));
  if (nodes.length < 2) return;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var narrow = window.matchMedia ? window.matchMedia('(max-width: 760px)') : { matches: false };

  // ---- expand / collapse ------------------------------------------------------------------
  nodes.forEach(function (node) {
    var head = node.querySelector('.tg-head');
    head.addEventListener('click', function () {
      var open = head.getAttribute('aria-expanded') === 'true';
      head.setAttribute('aria-expanded', String(!open));
      node.classList.toggle('is-open', !open);
    });
    if (head.getAttribute('aria-expanded') === 'true') node.classList.add('is-open');
  });

  // ---- geometry ---------------------------------------------------------------------------
  function box(el) {
    var r = el.getBoundingClientRect(), c = root.getBoundingClientRect();
    return { l: r.left - c.left, r: r.right - c.left, t: r.top - c.top, b: r.bottom - c.top, cx: r.left - c.left + r.width / 2, cy: r.top - c.top + r.height / 2 };
  }
  // an orthogonal path through points with rounded corners
  function rounded(points, radius) {
    var d = 'M' + points[0][0] + ' ' + points[0][1];
    for (var i = 1; i < points.length - 1; i++) {
      var p0 = points[i - 1], p1 = points[i], p2 = points[i + 1];
      var l1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      var r = Math.min(radius, l1 / 2, l2 / 2);
      var a = [p1[0] + ((p0[0] - p1[0]) / l1) * r, p1[1] + ((p0[1] - p1[1]) / l1) * r];
      var b = [p1[0] + ((p2[0] - p1[0]) / l2) * r, p1[1] + ((p2[1] - p1[1]) / l2) * r];
      d += ' L' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' Q' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
    }
    var last = points[points.length - 1];
    return d + ' L' + last[0].toFixed(1) + ' ' + last[1].toFixed(1);
  }

  var parts = [];           // {path, glow, dotA, dotB, runner}
  function ensure(count) {
    while (parts.length < count) {
      var p = {
        path: document.createElementNS(NS, 'path'), flow: document.createElementNS(NS, 'path'),
        dotA: document.createElementNS(NS, 'circle'), dotB: document.createElementNS(NS, 'circle'), runner: document.createElementNS(NS, 'circle')
      };
      p.path.setAttribute('class', 'tg-path');
      p.flow.setAttribute('class', 'tg-flow');
      p.dotA.setAttribute('class', 'tg-dot'); p.dotB.setAttribute('class', 'tg-dot');
      p.dotA.setAttribute('r', '4.5'); p.dotB.setAttribute('r', '4.5');
      p.runner.setAttribute('class', 'tg-runner'); p.runner.setAttribute('r', '4');
      p.runner.setAttribute('cx', '0'); p.runner.setAttribute('cy', '0');
      p.runner.style.animationDelay = (parts.length * -1.3) + 's';
      svg.appendChild(p.path); svg.appendChild(p.flow); svg.appendChild(p.runner); svg.appendChild(p.dotA); svg.appendChild(p.dotB);
      parts.push(p);
    }
    parts.forEach(function (p, i) { var on = i < count; [p.path, p.flow, p.dotA, p.dotB, p.runner].forEach(function (e) { e.style.display = on ? '' : 'none'; }); });
  }
  function set(p, points, radius) {
    var d = rounded(points, radius);
    p.path.setAttribute('d', d);
    p.flow.setAttribute('d', d);
    var a = points[0], z = points[points.length - 1];
    p.dotA.setAttribute('cx', a[0]); p.dotA.setAttribute('cy', a[1]);
    p.dotB.setAttribute('cx', z[0]); p.dotB.setAttribute('cy', z[1]);
    p.runner.style.offsetPath = "path('" + d + "')";
  }

  var frame = 0;
  function draw() {
    frame = 0;
    var c = root.getBoundingClientRect();
    svg.setAttribute('width', c.width); svg.setAttribute('height', c.height);
    svg.setAttribute('viewBox', '0 0 ' + c.width + ' ' + c.height);
    var b = nodes.map(box);
    if (narrow.matches || nodes.length !== 6) {
      ensure(nodes.length - 1);
      for (var i = 0; i < nodes.length - 1; i++) set(parts[i], [[b[i].cx, b[i].b], [b[i + 1].cx, b[i + 1].t]], 10);
      return;
    }
    ensure(6);
    var mid = (b[0].b + Math.min(b[1].t, b[2].t)) / 2;
    set(parts[0], [[b[0].cx, b[0].b], [b[0].cx, mid], [b[1].cx, mid], [b[1].cx, b[1].t]], 16);   // company → workspace
    set(parts[1], [[b[0].cx, b[0].b], [b[0].cx, mid], [b[2].cx, mid], [b[2].cx, b[2].t]], 16);   // company → deal
    set(parts[2], [[b[1].cx, b[1].b], [b[3].cx, b[3].t]], 10);                                    // clinical → academic
    set(parts[3], [[b[2].cx, b[2].b], [b[5].cx, b[5].t]], 10);                                    // pharma → case study
    set(parts[4], [[b[3].cx, b[3].b], [b[3].cx, b[4].cy], [b[4].l, b[4].cy]], 16);               // academic → bioinformatics (left side)
    set(parts[5], [[b[5].cx, b[5].b], [b[5].cx, b[4].cy], [b[4].r, b[4].cy]], 16);               // case study → bioinformatics (right side)
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(draw); }

  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(schedule);
    ro.observe(root);
    nodes.forEach(function (n) { ro.observe(n); });
  } else window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  if (narrow.addEventListener) narrow.addEventListener('change', schedule);
  schedule();

  // pause the running dots while the diagram is off screen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      root.classList.toggle('is-idle', !entries.some(function (e) { return e.isIntersecting; }) || reduce);
    }).observe(root);
  }
})();
