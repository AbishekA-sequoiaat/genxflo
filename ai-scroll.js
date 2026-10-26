/*
 * ai-scroll.js — pinned, scroll-driven version of the "We integrated AI" section (desktop only).
 * While the section is pinned the crystal ball starts large and centred, then slides left; a line is drawn from the
 * ball to the first step card, and the three step cards arrive one by one (the newest is highlighted and larger).
 * Below 1000px wide / with reduced motion the section stays the normal stacked layout.
 */
(function () {
  'use strict';
  var section = document.getElementById('ai-workflow');
  if (!section) return;
  var sticky = section.querySelector('.ai-sticky');
  var ballwrap = section.querySelector('.ai-ballwrap');
  var side = section.querySelector('.ai-side');
  var tabsEl = section.querySelector('.ai-tabs');
  var tabs = [].slice.call(section.querySelectorAll('[data-ai-tab]'));
  var details = section.querySelector('.ai-details');
  var cta = section.querySelector('.ai-cta');
  if (!sticky || !ballwrap || !side || !tabsEl || tabs.length !== 3) return;

  var NS = 'http://www.w3.org/2000/svg';
  var mq = window.matchMedia('(min-width: 1000px) and (min-height: 620px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var svg = null, lines = [], pinned = false, raf = 0, lastStep = -1, ticking = false;
  // scroll progress (0..1) at which each thing happens
  var T = { move: [0.06, 0.30], line: [0.20, 0.42], side: 0.30, tab: [0.42, 0.56, 0.72], link: [[0.50, 0.56], [0.64, 0.70]], cta: 0.9 };

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function span(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function makeLines() {
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'ai-conn'); svg.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 3; i++) {
      var g = { base: document.createElementNS(NS, 'path'), draw: document.createElementNS(NS, 'path'), dot: document.createElementNS(NS, 'circle') };
      g.base.setAttribute('class', 'ai-conn__base');
      g.draw.setAttribute('class', 'ai-conn__draw'); g.draw.setAttribute('pathLength', '1');
      g.dot.setAttribute('class', 'ai-conn__dot'); g.dot.setAttribute('r', '5');
      svg.appendChild(g.base); svg.appendChild(g.draw); svg.appendChild(g.dot);
      lines.push(g);
    }
    sticky.appendChild(svg);
  }

  function progress() {
    var r = section.getBoundingClientRect();
    return clamp(-r.top / Math.max(section.offsetHeight - window.innerHeight, 1), 0, 1);
  }

  var geo = null;   // layout measurements, refreshed only when the size changes (not on every scroll tick)
  function measure() {
    var sr = sticky.getBoundingClientRect(), tr = tabsEl.getBoundingClientRect();
    geo = {
      vw: sr.width, vh: sr.height, S: ballwrap.offsetWidth,
      box: tabs.map(function (t) { return { l: tr.left - sr.left + t.offsetLeft, r: tr.left - sr.left + t.offsetLeft + t.offsetWidth, y: tr.top - sr.top + t.offsetTop + t.offsetHeight / 2 }; })
    };
    svg.setAttribute('width', geo.vw); svg.setAttribute('height', geo.vh); svg.setAttribute('viewBox', '0 0 ' + geo.vw + ' ' + geo.vh);
  }
  function onResize() { geo = null; schedule(); }

  function update() {
    raf = 0;
    if (!pinned) return;
    var p = progress();
    if (!geo) measure();
    var vw = geo.vw, vh = geo.vh, S = geo.S;

    // 1. the ball slides left and settles a little smaller
    var e = ease(span(p, T.move[0], T.move[1]));
    var s0 = 1.5, sf = 0.82, scale = s0 + (sf - s0) * e;
    var xf = vw * 0.05 + (S * sf) / 2;
    var dx = (xf - vw / 2) * e;
    ballwrap.style.setProperty('--bx', dx.toFixed(1) + 'px');
    ballwrap.style.setProperty('--bs', scale.toFixed(3));

    // 2. the cards come in one by one
    side.classList.toggle('is-in', p >= T.side);
    details.classList.toggle('is-in', p >= T.tab[0]);
    tabs.forEach(function (t, i) { t.classList.toggle('is-in', p >= T.tab[i]); });
    if (cta) cta.classList.toggle('is-in', p >= T.cta);
    var step = p >= T.tab[2] ? 2 : p >= T.tab[1] ? 1 : p >= T.tab[0] ? 0 : -1;
    if (step >= 0 && step !== lastStep) tabs[step].click();
    lastStep = step;

    // 3. the connecting lines
    var box = geo.box;
    var cx = vw / 2 + dx, cy = vh / 2, rad = S * scale * 0.34;
    var a = { x: cx + rad, y: cy }, b = { x: box[0].l - 8, y: box[0].y };
    var k = Math.max(60, (b.x - a.x) * 0.5);
    var d0 = 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' C' + (a.x + k).toFixed(1) + ' ' + a.y.toFixed(1) + ' ' + (b.x - k).toFixed(1) + ' ' + b.y.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
    var defs = [{ d: d0, end: b, prog: span(p, T.line[0], T.line[1]) }];
    for (var i = 0; i < 2; i++) {
      var s0 = { x: box[i].r + 4, y: box[i].y }, s1 = { x: box[i + 1].l - 8, y: box[i + 1].y };
      defs.push({ d: 'M' + s0.x.toFixed(1) + ' ' + s0.y.toFixed(1) + ' L' + s1.x.toFixed(1) + ' ' + s1.y.toFixed(1), end: s1, prog: span(p, T.link[i][0], T.link[i][1]) });
    }
    defs.forEach(function (df, i) {
      var g = lines[i];
      g.base.setAttribute('d', df.d); g.draw.setAttribute('d', df.d);
      g.base.style.opacity = df.prog > 0 ? 1 : 0;
      g.draw.style.strokeDashoffset = (1 - df.prog).toFixed(4);
      g.draw.style.opacity = df.prog > 0 ? 1 : 0;
      g.dot.setAttribute('cx', df.end.x); g.dot.setAttribute('cy', df.end.y);
      g.dot.style.opacity = df.prog >= 0.999 ? 1 : 0;
    });
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(update); }

  function enable() {
    if (pinned) return;
    pinned = true; lastStep = -1;
    section.classList.add('ai-pinned');
    if (!svg) makeLines();
    svg.style.display = '';
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);
    geo = null; schedule();
  }
  function disable() {
    if (!pinned) return;
    pinned = false;
    section.classList.remove('ai-pinned');
    [ballwrap, side, details, cta].concat(tabs).forEach(function (el) { if (el) el.classList.remove('is-in'); });
    ballwrap.style.removeProperty('--bx'); ballwrap.style.removeProperty('--bs');
    if (svg) svg.style.display = 'none';
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', onResize);
  }
  function check() { (mq.matches && !reduce.matches) ? enable() : disable(); }
  if (mq.addEventListener) { mq.addEventListener('change', check); reduce.addEventListener('change', check); }
  check();
  window.addEventListener('load', onResize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
})();
