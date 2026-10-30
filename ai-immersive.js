/*
 * ai-immersive.js — the "We integrated AI to ease the workflow" scene.
 * Three steps that advance by themselves (progress bar on the active step), an AI log that types out each step,
 * a cursor spotlight and depth parallax on the core. Pauses when hovered or off screen; static with reduced motion.
 */
(function () {
  'use strict';
  var root = document.querySelector('[data-ax]');
  if (!root) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  var STEPS = [
    { t: 'Design Visually', d: 'Build and connect processes effortlessly using our visual workflow builder. Create complete bioinformatics workflows in minutes through an intuitive drag-and-drop interface.', log: ['Reading your canvas\u2026', 'FastQC \u2192 STAR \u2192 Salmon linked', 'Inputs and outputs matched', 'Draft pipeline ready'] },
    { t: 'Configure Parameters', d: 'Easily set input files, adjust tool parameters, and manage compute resources using smart, guided forms. Simplifies bioinformatics workflow automation by handling syntax for you.', log: ['Suggesting defaults for STAR', 'Reference set to GRCh38', 'Threads: 8, paired-end on', 'All parameters validated'] },
    { t: 'Generate & Deploy', d: 'Export clean, production-ready bioinformatics pipelines and run them anywhere: locally, on HPC, or in the cloud. Ensure your workflow stays reproducible, scalable, and easy to maintain.', log: ['Generating Nextflow code\u2026', 'Containers pinned and documented', 'Targets ready: local, HPC, cloud', 'Pipeline exported \u2713'] }
  ];
  var DURATION = 7500;
  var tabs = [].slice.call(root.querySelectorAll('[data-ax-tab]'));
  var views = [].slice.call(root.querySelectorAll('[data-ax-v]'));
  var q = function (s) { return root.querySelector(s); };
  var linesEl = q('[data-ax-lines]');
  var narrow = window.matchMedia('(max-width: 1000px)');
  var logEl = q('.ax-log'), stepsEl = q('.ax-steps');
  // phones and tablets: the steps become an accordion and the AI card opens right under the chosen step
  function place() {
    if (narrow.matches) stepsEl.insertBefore(logEl, tabs[cur].nextSibling);
    else stepsEl.parentNode.appendChild(logEl);
  }
  var cur = 0, timer = 0, typer = [], hovering = false, visible = false;

  function type(lines) {
    typer.forEach(clearTimeout); typer = [];
    linesEl.innerHTML = '';
    lines.forEach(function (text, i) {
      var p = document.createElement('p');
      p.innerHTML = '<i></i><span></span>';
      linesEl.appendChild(p);
      var span = p.querySelector('span');
      var delay = reduce ? 0 : 500 + i * 1500;
      typer.push(setTimeout(function () {
        p.classList.add('is-in');
        if (reduce) { span.textContent = text; return; }
        var n = 0;
        (function step() { n += 2; span.textContent = text.slice(0, n); if (n < text.length) typer.push(setTimeout(step, 24)); })();
      }, delay));
    });
  }
  function plan() {
    clearTimeout(timer);
    root.classList.toggle('is-paused', hovering || !visible || reduce);
    if (reduce || hovering || !visible || narrow.matches) return;
    timer = setTimeout(function () { show(cur + 1); }, DURATION);
  }
  function show(i, focus) {
    cur = (i + STEPS.length) % STEPS.length;
    tabs.forEach(function (t, k) {
      var on = k === cur;
      t.classList.toggle('is-on', on); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      var u = t.querySelector('.ax-bar u');
      u.style.animation = 'none'; void u.offsetWidth; u.style.animation = '';
    });
    views.forEach(function (v) { v.classList.toggle('is-on', +v.getAttribute('data-ax-v') === cur); });
    if (focus) tabs[cur].focus();
    var ttl = q('[data-ax-title]'); if (ttl) ttl.textContent = STEPS[cur].t;
    q('[data-ax-no]').textContent = 'Step ' + (cur + 1);
    q('[data-ax-desc]').textContent = STEPS[cur].d;
    root.classList.remove('is-swap'); void root.offsetWidth; root.classList.add('is-swap');
    type(STEPS[cur].log);
    place();
    plan();
  }
  tabs.forEach(function (t, k) {
    t.addEventListener('click', function () { show(k); });
    t.addEventListener('keydown', function (e) {
      var s = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
      if (!s) return; e.preventDefault(); show(cur + s, true);
    });
  });
  var stage = q('.ax-stage');
  stage.addEventListener('pointerenter', function () { hovering = true; plan(); });
  stage.addEventListener('pointerleave', function () { hovering = false; plan(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; root.classList.toggle('is-off', !visible); if (visible) { plan(); } else clearTimeout(timer); }, { threshold: 0.25 }).observe(root);
  } else visible = true;
  show(0);
  (narrow.addEventListener ? narrow.addEventListener('change', function () { place(); plan(); }) : 0);

  // pointer: spotlight + depth parallax
  if (reduce || !fine) return;
  var core = q('[data-ax-core]'), layers = [].slice.call(root.querySelectorAll('[data-depth]')), queued = false, nx = 0, ny = 0;
  function paint() {
    queued = false;
    core.style.setProperty('--ry', (nx * 6).toFixed(2) + 'deg');
    core.style.setProperty('--rx', (-ny * 4).toFixed(2) + 'deg');
    layers.forEach(function (l) { var k = +l.getAttribute('data-depth'); l.style.translate = (nx * k).toFixed(1) + 'px ' + (ny * k * 0.7).toFixed(1) + 'px'; });
  }
  root.addEventListener('pointermove', function (e) {
    var r = root.getBoundingClientRect();
    root.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    root.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    var c = core.getBoundingClientRect();
    nx = ((e.clientX - c.left) / c.width - .5) * 2; ny = ((e.clientY - c.top) / c.height - .5) * 2;
    nx = Math.max(-1, Math.min(1, nx)); ny = Math.max(-1, Math.min(1, ny));
    if (!queued) { queued = true; requestAnimationFrame(paint); }
  }, { passive: true });
})();
