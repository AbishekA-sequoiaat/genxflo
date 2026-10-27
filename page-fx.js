/*
 * page-fx.js — the motion layer for the content pages (use cases, AI features, learn, ...).
 * Reading-progress bar, scroll reveals, a cursor spotlight on content blocks, a drawn-in rail
 * and a small animated pipeline either side of centred page heroes. Everything is progressive:
 * without JS (or with reduced motion) the pages read exactly as before.
 */
(function () {
  'use strict';

  var main = document.querySelector('main');
  if (!main || !main.querySelector('.pl, .po')) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  root.classList.add('fx');

  // ---- reading progress
  var bar = document.createElement('div');
  bar.className = 'fx-bar';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  var ticking = false;
  function progress() {
    ticking = false;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(progress); }
  }, { passive: true });
  progress();

  // ---- hero: a little animated pipeline on each side of a centred hero
  function cluster(side, id) {
    var names = side === 'l' ? ['FastQC', 'FastP', 'Hisat2', 'Samtools'] : ['STAR', 'Salmon', 'BWA', 'GATK'];
    var pos = [[14, 22], [150, 78], [28, 168], [156, 236], [34, 306]];
    var links = [[0, 1], [1, 3], [2, 3], [0, 2]];
    var s = '<svg viewBox="0 0 300 360" aria-hidden="true" focusable="false"><defs><filter id="fxs' + id + '" x="-20%" y="-30%" width="140%" height="190%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#06a065" flood-opacity=".22"/></filter></defs>';
    links.forEach(function (l, i) {
      var a = pos[l[0]]; var b = pos[l[1]];
      var x1 = a[0] + 112; var y1 = a[1] + 19; var x2 = b[0]; var y2 = b[1] + 19;
      if (x2 < x1) { x1 = a[0] + 56; y1 = a[1] + 38; x2 = b[0] + 56; y2 = b[1]; }
      var d = x2 < x1 + 1 || y2 < y1 ? 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + (y1 + 40) + ' ' + x2 + ',' + (y2 - 40) + ' ' + x2 + ',' + y2 : 'M' + x1 + ',' + y1 + ' C' + (x1 + 44) + ',' + y1 + ' ' + (x2 - 44) + ',' + y2 + ' ' + x2 + ',' + y2;
      s += '<path id="fxp' + id + i + '" class="fx-link" d="' + d + '"/>';
      if (!reduce) s += '<circle r="3.4" class="fx-dot"><animateMotion dur="' + (3.2 + i * 0.7) + 's" begin="' + (i * 0.6) + 's" repeatCount="indefinite"><mpath href="#fxp' + id + i + '"/></animateMotion></circle>';
    });
    names.forEach(function (n, i) {
      s += '<g class="fx-node" style="animation-delay:-' + (i * 1.3) + 's"><rect x="' + pos[i][0] + '" y="' + pos[i][1] + '" width="112" height="38" rx="9" filter="url(#fxs' + id + ')"/><text x="' + (pos[i][0] + 56) + '" y="' + (pos[i][1] + 24) + '" text-anchor="middle">' + n + '</text><circle cx="' + pos[i][0] + '" cy="' + (pos[i][1] + 19) + '" r="3.5"/><circle cx="' + (pos[i][0] + 112) + '" cy="' + (pos[i][1] + 19) + '" r="3.5"/></g>';
    });
    return s + '</svg>';
  }
  var hero = main.querySelector('section');
  var h1 = hero && hero.querySelector('h1');
  if (hero && h1 && getComputedStyle(h1).textAlign === 'center') {
    hero.classList.add('fx-host');
    var deco = document.createElement('div');
    deco.className = 'fx-deco';
    deco.setAttribute('aria-hidden', 'true');
    deco.innerHTML = '<div class="fx-side fx-sl">' + cluster('l', 1) + '</div><div class="fx-side fx-sr">' + cluster('r', 2) + '</div>';
    hero.insertBefore(deco, hero.firstChild);
  }

  // ---- scroll reveals
  if (!('IntersectionObserver' in window)) return;
  var sel = '.pl-head, .pl-box, .pl-faq, .po-head, .po-card, .po-flow, .pl-body > p, .pl-body > ul, .pl-body > figure, .pl-body > .grid, .po .grid > .pl-box';
  var seen = [];
  [].forEach.call(main.querySelectorAll(sel), function (n) {
    if (seen.indexOf(n) > -1) return;
    var p = n.parentElement;
    if (p && p.closest('details')) return;
    seen.push(n);
    var top = n.getBoundingClientRect().top;
    if (top > window.innerHeight * 0.92) n.classList.add('fx-r');
  });
  var queue = 0;
  var qTimer = 0;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var n = e.target;
      io.unobserve(n);
      var d = Math.min(queue++, 5) * 70;
      n.style.setProperty('--d', d + 'ms');
      n.classList.add('fx-in');
      setTimeout(function () { n.classList.remove('fx-r', 'fx-in'); n.style.removeProperty('--d'); }, 950 + d);
      clearTimeout(qTimer);
      qTimer = setTimeout(function () { queue = 0; }, 120);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  seen.forEach(function (n) { if (n.classList.contains('fx-r')) io.observe(n); });

  // sections: draw the rail line / animate the band when they come into view
  var secIo = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('fx-sec'); secIo.unobserve(e.target); } });
  }, { threshold: 0.12 });
  [].forEach.call(main.querySelectorAll('.pl, .po-custom-components, .po-mcp'), function (s) { secIo.observe(s); });

  // ---- cursor spotlight on blocks
  if (!reduce) {
    main.addEventListener('pointermove', function (e) {
      var t = e.target.closest && e.target.closest('.pl-box, .pl-faq, .po-card');
      if (!t) return;
      var r = t.getBoundingClientRect();
      t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      t.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }
})();
