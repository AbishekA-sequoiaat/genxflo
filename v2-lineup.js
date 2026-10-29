/*
 * v2-lineup.js — "the lineup" section: pick an item in the list and the dial's marker, the title and the
 * details on the right follow. Arrow keys move between items. Works without JS (item 001 is the markup).
 */
(function () {
  'use strict';
  var root = document.querySelector('[data-ln]');
  if (!root) return;
  var items = [
    { cap: '001 / System — Drag', name: 'Visual Canvas', desc: 'A drag-and-drop canvas designed to turn a pipeline idea into a structured workflow, with every tool one click away.', r: ['Build / Design', 'No-code / Visual', 'Drag-and-drop canvas'], href: 'pages/product-overview.html#steps' },
    { cap: '002 / System — Connect', name: 'Guided Connections', desc: 'Link inputs and outputs with a click. Guided parameter forms keep every connection consistent from the first draft.', r: ['Build / Link', 'Input → Output ports', 'Smart parameter forms'], href: 'pages/product-overview.html#steps' },
    { cap: '003 / System — Validate', name: 'AI Validation', desc: 'AI inspects tool compatibility and data flow, so mismatched formats and missing inputs are caught before you run.', r: ['Check / Pre-run', 'AI-assisted report', 'DAG and parameter checks'], href: 'pages/ai-features.html' },
    { cap: '004 / System — Export', name: 'Production Export', desc: 'Export clean, reproducible Nextflow pipelines that run locally, on HPC or in the cloud.', r: ['Ship / Anywhere', 'Nextflow pipeline', 'Clean, documented code'], href: 'pages/workflow-export.html' }
  ];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tabs = [].slice.call(root.querySelectorAll('[data-ln-tab]'));
  var list = root.querySelector('.ln-list');
  var tick = root.querySelector('[data-ln-tick]');
  var right = root.querySelector('.ln-right');
  var q = function (s) { return root.querySelector(s); };
  var visuals = [].slice.call(root.querySelectorAll('[data-ln-v]'));
  var cur = 0;

  function show(i, focus) {
    cur = (i + items.length) % items.length;
    var it = items[cur];
    list.style.setProperty('--i', cur);
    if (tick) tick.style.setProperty('--a', (cur * 90) + 'deg');
    tabs.forEach(function (t, k) {
      var on = k === cur;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    visuals.forEach(function (v) { v.classList.toggle('is-on', +v.getAttribute('data-ln-v') === cur); });
    if (focus) tabs[cur].focus();
    right.classList.add('is-swap');
    setTimeout(function () {
      q('[data-ln-cap]').textContent = it.cap;
      q('[data-ln-name]').textContent = it.name;
      q('[data-ln-desc]').textContent = it.desc;
      q('[data-ln-r1]').textContent = it.r[0];
      q('[data-ln-r2]').textContent = it.r[1];
      q('[data-ln-r3]').textContent = it.r[2];
      q('[data-ln-link]').setAttribute('href', it.href);
      right.classList.remove('is-swap');
    }, reduce ? 0 : 180);
  }

  tabs.forEach(function (t, k) {
    t.addEventListener('click', function () { show(k); });
    t.addEventListener('keydown', function (e) {
      var step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      show(cur + step, true);
    });
  });
})();
