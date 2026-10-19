/*
 * AiFlow — draws the curved connector lines for the "We integrated AI" section.
 * Pain-point pills on the left run into the hexagon, and curves leave it for the
 * outcome pills on the right. Paths are measured from the real pill positions,
 * so they follow the layout at any width. Used by every [data-aiw] stage.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    var node = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function AiFlow(stage) {
    var svg = stage.querySelector('.aiw-lines');
    var pains = [].slice.call(stage.querySelectorAll('.aiw-pill--pain'));
    var gains = [].slice.call(stage.querySelectorAll('.aiw-pill--gain'));
    var hex = stage.querySelector('.aiw-hex');
    if (!svg || !hex) return;
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    function curve(sx, sy, ex, ey, pull) {
      var dx = (ex - sx) * (pull || 0.55);
      return 'M' + sx + ',' + sy + ' C' + (sx + dx) + ',' + sy + ' ' + (ex - dx) + ',' + ey + ' ' + ex + ',' + ey;
    }

    function draw() {
      svg.replaceChildren();
      if (window.innerWidth <= 900) return;
      var box = stage.getBoundingClientRect();
      if (!box.width) return;
      var w = box.width, h = box.height;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      var hr = hex.getBoundingClientRect();
      var hl = hr.left - box.left, hrt = hr.right - box.left, hy = hr.top - box.top + hr.height / 2;

      var defs = el('defs');
      var g1 = el('linearGradient', { id: 'aiw-pain', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: hl, y2: 0 });
      g1.appendChild(el('stop', { offset: '0', 'stop-color': '#e5484d', 'stop-opacity': '.95' }));
      g1.appendChild(el('stop', { offset: '.55', 'stop-color': '#d9742f', 'stop-opacity': '.8' }));
      g1.appendChild(el('stop', { offset: '1', 'stop-color': '#06a065', 'stop-opacity': '.95' }));
      var g2 = el('linearGradient', { id: 'aiw-gain', gradientUnits: 'userSpaceOnUse', x1: hrt, y1: 0, x2: w, y2: 0 });
      g2.appendChild(el('stop', { offset: '0', 'stop-color': '#06a065', 'stop-opacity': '.95' }));
      g2.appendChild(el('stop', { offset: '1', 'stop-color': '#4ce3a3', 'stop-opacity': '.55' }));
      defs.appendChild(g1); defs.appendChild(g2);
      svg.appendChild(defs);

      var dots = [];
      pains.forEach(function (pill, i) {
        var r = pill.getBoundingClientRect();
        var sx = r.right - box.left, sy = r.top - box.top + r.height / 2;
        var d = curve(sx, sy, hl, hy, 0.58);
        svg.appendChild(el('path', { d: d, fill: 'none', stroke: 'url(#aiw-pain)', 'stroke-width': 1.3 }));
        dots.push({ d: d, i: i, color: '#06a065', dur: 3.4 + (i % 4) * 0.5 });
      });
      gains.forEach(function (pill, i) {
        var r = pill.getBoundingClientRect();
        var ex = r.left - box.left, ey = r.top - box.top + r.height / 2;
        var rx = r.right - box.left;
        var d1 = curve(hrt, hy, ex, ey, 0.55);
        var d2 = curve(rx, ey, w, hy, 0.5);
        svg.appendChild(el('path', { d: d1, fill: 'none', stroke: 'url(#aiw-gain)', 'stroke-width': 1.3 }));
        svg.appendChild(el('path', { d: d2, fill: 'none', stroke: 'url(#aiw-gain)', 'stroke-width': 1.3, 'stroke-opacity': '.6' }));
        dots.push({ d: d1, i: i + 10, color: '#06a065', dur: 2.6 + i * 0.4 });
      });

      if (reduce) return;
      dots.forEach(function (dot) {
        var c = el('circle', { r: 2.6, fill: dot.color });
        c.setAttribute('class', 'aiw-dot');
        var m = el('animateMotion', { dur: dot.dur + 's', repeatCount: 'indefinite', begin: (dot.i * 0.37 % 3).toFixed(2) + 's', path: dot.d, calcMode: 'linear' });
        c.appendChild(m);
        svg.appendChild(c);
      });
    }

    var ro = new ResizeObserver(draw);
    ro.observe(stage);
    window.addEventListener('load', draw);
    draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  }

  function init() { document.querySelectorAll('[data-aiw]').forEach(AiFlow); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
