/*
 * v2-sections.js — behaviour for the two new Version 2 sections.
 *  [data-trk]  workflow tour: 4 slides, auto-advances, progress line, counter, tabs
 *  [data-phn]  "Why GenXflo": phone-style card with three tabs
 * Everything reads fine without JS (first slide / Validate tab are the static markup).
 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- workflow tour
  var root = document.querySelector('[data-trk]');
  if (root) {
    var slides = [
      { t: 'Design pipelines visually', d: 'Drag tools onto a canvas, connect them and build a complete Nextflow workflow without writing a line of syntax.', st: 'Canvas nodes', v: '24', u: '', dl: '+3' },
      { t: 'Connect every step', d: 'Link inputs and outputs with a click. Parameters are guided, so every connection stays valid from the first draft.', st: 'Linked steps', v: '18', u: '', dl: '+2' },
      { t: 'Validate with AI before you run', d: 'AI checks tool compatibility and data flow, so errors are caught while you design instead of after you launch.', st: 'Pipeline checks', v: '100', u: '%', dl: '+12' },
      { t: 'Export production-ready code', d: 'Generate clean, reproducible pipelines and run them locally, on HPC or in the cloud, with everything documented.', st: 'Run targets', v: '3', u: '', dl: '+1' }
    ];
    var DURATION = 6500;
    var imgs = [].slice.call(root.querySelectorAll('.trk-imgs img'));
    var tabs = [].slice.call(root.querySelectorAll('[data-trk-tab]'));
    var prog = root.querySelector('.trk-prog i');
    var copy = root.querySelector('.trk-copy');
    var q = function (s) { return root.querySelector(s); };
    var cur = 0, timer = 0, hovering = false, visible = false;

    function show(i) {
      cur = (i + slides.length) % slides.length;
      var s = slides[cur];
      copy.classList.add('is-swap');
      setTimeout(function () {
        q('[data-trk-title]').textContent = s.t;
        q('[data-trk-desc]').textContent = s.d;
        copy.classList.remove('is-swap');
      }, reduce ? 0 : 180);
      q('[data-trk-stat-t]').textContent = s.st;
      q('[data-trk-val]').textContent = s.v;
      q('[data-trk-unit]').textContent = s.u;
      q('[data-trk-delta]').textContent = s.dl;
      q('[data-trk-n]').textContent = String(cur + 1);
      q('[data-trk-bar]').style.width = ((cur + 1) / slides.length * 100) + '%';
      imgs.forEach(function (im, k) { im.classList.toggle('is-on', k === cur); });
      tabs.forEach(function (tb, k) { tb.classList.toggle('is-on', k === cur); tb.setAttribute('aria-selected', String(k === cur)); });
      restart();
    }
    function restart() {
      clearTimeout(timer);
      prog.style.transition = 'none';
      prog.style.transform = 'scaleX(0)';
      void prog.offsetWidth;
      if (reduce) { prog.style.transform = 'scaleX(' + ((cur + 1) / slides.length) + ')'; return; }
      if (!visible || hovering) return;
      prog.style.transition = 'transform ' + DURATION + 'ms linear';
      prog.style.transform = 'scaleX(1)';
      timer = setTimeout(function () { show(cur + 1); }, DURATION);
    }
    tabs.forEach(function (tb, k) { tb.addEventListener('click', function () { show(k); }); });
    q('[data-trk-next]').addEventListener('click', function () { show(cur + 1); });
    root.addEventListener('pointerenter', function () { hovering = true; clearTimeout(timer); prog.style.transition = 'none'; });
    root.addEventListener('pointerleave', function () { hovering = false; restart(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) restart(); else clearTimeout(timer);
      }, { threshold: 0.35 }).observe(root);
    }
    q('[data-trk-bar]').style.width = (1 / slides.length * 100) + '%';
    if (reduce) restart();
  }

  // ---- from idea to pipeline: phone-style card with three tabs
  var ph = document.querySelector('[data-phn]');
  if (ph) {
    var views = [
      { k: 'MCP SERVER', v: '1', u: 'prompt' },
      { k: 'VERSIONS KEPT', v: '12', u: 'snapshots' },
      { k: 'CUSTOM TOOLS', v: '+1', u: 'component' }
    ];
    var pt = [].slice.call(ph.querySelectorAll('[data-phn-tab]'));
    var pi = [].slice.call(ph.querySelectorAll('[data-phn-img]'));
    var pcur = 1, ptimer = 0, phover = false, pvisible = false;
    function pshow(i) {
      pcur = (i + pt.length) % pt.length;
      pt.forEach(function (x, k2) { var on = k2 === pcur; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', String(on)); });
      pi.forEach(function (im) { im.classList.toggle('is-on', +im.getAttribute('data-phn-img') === pcur); });
      ph.querySelector('[data-phn-k]').textContent = views[pcur].k;
      ph.querySelector('[data-phn-val]').textContent = views[pcur].v;
      ph.querySelector('[data-phn-unit]').textContent = views[pcur].u;
      pplan();
    }
    // the tabs change by themselves, in a loop (paused while hovered, focused or off screen)
    function pplan() {
      clearTimeout(ptimer);
      if (reduce || phover || !pvisible) return;
      ptimer = setTimeout(function () { pshow(pcur + 1); }, 3800);
    }
    pt.forEach(function (tb) { tb.addEventListener('click', function () { pshow(+tb.getAttribute('data-phn-tab')); }); });
    ph.addEventListener('pointerenter', function () { phover = true; clearTimeout(ptimer); });
    ph.addEventListener('pointerleave', function () { phover = false; pplan(); });
    ph.addEventListener('focusin', function () { phover = true; clearTimeout(ptimer); });
    ph.addEventListener('focusout', function () { phover = false; pplan(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { pvisible = e[0].isIntersecting; if (pvisible) pplan(); else clearTimeout(ptimer); }, { threshold: 0.3 }).observe(ph);
    }
  }

  // ---- Why GenXflo (cube section): feature explorer
  var wg = document.querySelector('[data-wg]');
  if (wg) {
    var F = [
      { t: 'Visual builder', link: 'pages/product-overview.html#steps',
        d: [['Interface', 'Drag-and-drop canvas'], ['Syntax', 'None to write by hand'], ['Output', 'Nextflow pipeline'], ['Start from', 'Ready-made templates']],
        st: [['1', 'canvas for every pipeline step', 'Visual builder'], ['0', 'lines of pipeline syntax by hand', 'No code'], ['4', 'steps: drag, connect, validate, export', 'Workflow']],
        n: ['Build workflows on a canvas, not in boilerplate.', 'Connect processes and configure analyses visually, without writing pipeline syntax by hand.'] },
      { t: 'Speed', link: 'pages/product-overview.html',
        d: [['Manual build', '40h'], ['With GenXflo', '4h'], ['Saved', '36 hours per pipeline'], ['Start with', 'Templates']],
        st: [['10\u00d7', 'less time building', 'Speed'], ['40h\u21924h', 'time to build a pipeline', 'Manual vs GenXflo'], ['36h', 'saved per pipeline', 'Time saved']],
        n: ['Less time building.', 'Start with templates and focus on the science.'] },
      { t: 'Bioinformatics tools', link: 'pages/integrations.html',
        d: [['Covers', 'QC, alignment, transcriptomics'], ['QC', 'FastQC, MultiQC'], ['Alignment', 'STAR, Hisat2, BWA'], ['Analysis', 'Salmon, DESeq2, Samtools']],
        st: [['8', 'popular tools one drag away', 'Tool library'], ['QC', 'alignment, transcriptomics and more', 'Coverage'], ['STAR', 'Salmon, DESeq2, MultiQC and more', 'Popular tools']],
        n: ['Tools scientists use.', 'QC, alignment, transcriptomics, and more.'] },
      { t: 'Nextflow', link: 'pages/workflow-export.html',
        d: [['Runs on', 'Local, HPC or cloud'], ['Command', 'nextflow run main.nf'], ['Containers', 'Docker ready'], ['Portable', 'By design']],
        st: [['3', 'places to run: local, HPC or cloud', 'Portability'], ['v24.04', 'Docker container ready', 'Containers'], ['1', 'command: nextflow run main.nf', 'Launch']],
        n: ['Portable by design.', 'Run locally, on HPC, or in the cloud.'] },
      { t: 'Reproducible runs', link: 'pages/product-overview.html',
        d: [['Versioned', 'Every output'], ['Latest', 'RNA-seq run v3'], ['History', 'v2 and v1 kept'], ['Result', 'Consistent analyses']],
        st: [['v3', 'latest RNA-seq run', 'Versioned outputs'], ['3', 'versions kept: v1, v2 and v3', 'History'], ['#a3f9c', 'run ID you can trace', 'Run trace']],
        n: ['Trace every run.', 'Versioned outputs keep analyses consistent.'] },
      { t: 'Collaboration', link: 'pages/product-overview.html',
        d: [['Share', 'Templates and snapshots'], ['Compare', 'Run comparison'], ['Team', 'One shared canvas'], ['Flow', 'Reads to report']],
        st: [['+3', 'teammates on one canvas', 'Team'], ['v2', 'template shared with the team', 'Templates'], ['1', 'canvas from reads to report', 'Workflow']],
        n: ['Keep teams aligned.', 'Share templates and snapshots with ease, then go from reads to a report in one canvas.'] }
    ];
    var wq = function (s) { return wg.querySelector(s); };
    var wtabs = [].slice.call(wg.querySelectorAll('[data-wg-tab]'));
    var wcur = 0;
    function wshow(i, focus) {
      wcur = (i + F.length) % F.length;
      var f = F[wcur];
      wtabs.forEach(function (t, k) { var on = k === wcur; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      if (focus) wtabs[wcur].focus();
      wg.querySelectorAll('[data-wg-v]').forEach(function (v) { v.classList.toggle('is-on', +v.getAttribute('data-wg-v') === wcur); });
      wq('[data-wg-title]').textContent = f.t;
      wq('[data-wg-pos]').textContent = '0' + (wcur + 1);
      wq('[data-wg-i]').textContent = '0' + (wcur + 1);
      wq('[data-wg-link]').setAttribute('href', f.link);
      f.d.forEach(function (x, k) { wq('[data-wg-d' + k + ']').textContent = x[0]; wq('[data-wg-s' + k + ']').textContent = x[1]; });
      f.st.forEach(function (x, k) {
        var c = wq('[data-wg-stat="' + k + '"]');
        c.querySelector('.wg-n').textContent = x[0];
        c.querySelector('.wg-t').textContent = x[1];
        c.querySelector('em').textContent = x[2];
      });
      wq('[data-wg-note1]').textContent = f.n[0];
      wq('[data-wg-note2]').textContent = f.n[1];
      wg.classList.remove('is-swap'); void wg.offsetWidth; wg.classList.add('is-swap');
    }
    wtabs.forEach(function (t, k) {
      t.addEventListener('click', function () { wshow(k); });
      t.addEventListener('keydown', function (e) {
        var s = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
        if (!s) return; e.preventDefault(); wshow(wcur + s, true);
      });
    });
    wshow(0);
  }
})();
