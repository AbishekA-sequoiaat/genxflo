/*
 * ProductDemo — an interactive replica of the GenXflo app, built from the product video.
 * Screens: Dashboard -> Create pipeline form -> Workflow editor (canvas) -> Validate -> Submitted -> Dashboard.
 *   const d = ProductDemo(containerElement);  d.reset();  d.destroy();
 */
(function () {
  'use strict';

  var W = 1280;
  var H = 602;
  var CW = W - 227;
  var CH = H - 64;
  var TOOLS = ['BWA', 'Cutadapt', 'FastP', 'FastQC', 'BBduk', 'Hisat2', 'Salmon', 'Star', 'Samtools', 'MultiQC', 'Dedupe', 'Freebayes', 'featureCounts', 'stringtie', 'bowtie2', 'spades', 'prokka', 'pydeseq2', 'GATK'];
  var NEEDS_REF = { BWA: 1, Hisat2: 1, Star: 1, Salmon: 1, bowtie2: 1 };
  var ALIGNERS = { BWA: 1, Hisat2: 1, Star: 1, bowtie2: 1 };
  var MODES = { bowtie2: ['bowtie2build', 'bowtie2'], Hisat2: ['hisat2build', 'hisat2'], BWA: ['bwa index', 'bwa mem'], Star: ['star genomeGenerate', 'star align'], Salmon: ['salmon index', 'salmon quant'] };
  var ARGS = { bowtie2: ['bowtie2_index_base', '--threads', '--large-index', '--end-to-end', '--very-fast', '--sensitive', '-x', '-p'] };
  var ARGS_DEF = ['--threads', '--outdir', '--sensitive', '--very-fast', '--min-length', '-p', '-q', '--verbose'];
  var SAMPLES = ['SRR3356400', 'SRR3356401', 'SRR3356402'];
  var NAME_SUG = ['wgs_standard', 'wgs_standard_bwa', 'wgs_gatk_template', 'wgs_standard_gatk', 'wgs_template', 'wgs_standard_updated', 'rnaseq_standard', 'rnaseq_template'];
  var RES_SUG = ['Reference Fasta File', 'reference', 'metadata', 'ref', 'gtf', 'genome_fasta'];
  var EXT_SUG = ['.bam', '.sam', '.vcf', '.fastq', '.fasta'];
  var BUILTIN = { 'RNA-seq standard': 'rna', 'RNA-seq Salmon differential': 'salmon', 'WGS standard': 'wgs' };
  var TYPES = ['Alignment', 'Quality', 'Other type', 'Genome indexing'];
  var DISC = 'This process uses an AI model to validate the pipeline. The results may not always be fully accurate and could contain errors. Please review all outputs carefully before proceeding.';
  var LABELS = { sample: 'Sample Node', block: 'Sample Block Node', resource: 'Resource Node' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }
  function rnd() { return String(100000 + Math.floor(Math.random() * 899999)); }
  // the bundled Phosphor font only carries a subset of icons, so the rest are inline SVG
  var SV = {
    'magnifying-glass': '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/>',
    'download-simple': '<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>',
    'upload-simple': '<path d="M12 16V5"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/>',
    'export': '<path d="M12 15V4"/><path d="m8 8 4-4 4 4"/><path d="M6 11H5v9h14v-9h-1"/>',
    'pencil-simple': '<path d="m4 20 1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/><path d="m14 7 3 3"/>',
    'trash': '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    'x-circle': '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>'
  };
  function ph(name, attrs) {
    attrs = attrs || '';
    var extra = '';
    attrs = attrs.replace(/class="([^"]*)"/, function (m, c) { extra = ' ' + c; return ''; });
    if (SV[name]) return '<i class="pf-ic' + extra + '" ' + attrs + '><svg viewBox="0 0 24 24" aria-hidden="true">' + SV[name] + '</svg></i>';
    return '<i class="ph-bold ph-' + name + extra + '" ' + attrs + '></i>';
  }

  function icon(name) {
    var paths = {
      undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
      nodes: '<circle cx="12" cy="7" r="2.6"/><circle cx="6" cy="17" r="2.6"/><circle cx="18" cy="17" r="2.6"/><path d="M12 9.6 7 14.6M12 9.6l5 5"/>',
      tool: '<path d="M14.7 6.3a4 4 0 0 0 5 5L21 12.6 12.6 21a2.1 2.1 0 0 1-3-3L18 9.6"/><path d="M14.7 6.3 11 10"/>',
      custom: '<path d="M12 3 4 7.5v9L12 21l8-4.5v-9z"/><path d="M12 12 4 7.5M12 12l8-4.5M12 12v9"/>',
      zin: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5M11 8v6M8 11h6"/>',
      zout: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5M8 11h6"/>',
      box: '<rect x="5" y="5" width="14" height="14" rx="2"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths[name] + '</svg>';
  }
  function rb(name, act, v, title, cls) {
    return '<button type="button" class="pf-rb' + (cls ? ' ' + cls : '') + '" data-act="' + act + '"' + (v ? ' data-v="' + v + '"' : '') + ' title="' + title + '" aria-label="' + title + '">' + icon(name) + '</button>';
  }

  var ART = '<svg class="pf-art" viewBox="0 0 160 100" aria-hidden="true"><path d="M38 34 100 14l22 44-62 20z" fill="#f2d36b"/><path d="M60 40l36-10" stroke="#b9902a" stroke-width="1.5" stroke-dasharray="4 3" fill="none"/><path d="M20 80c8-18 20-32 40-40l6 12c-12 6-18 16-24 30z" fill="#f3c9a0" stroke="#8a5a3a" stroke-width="1.5"/><path d="M142 76c-6-16-14-28-34-34l-6 12c10 4 14 14 20 26z" fill="#f3c9a0" stroke="#8a5a3a" stroke-width="1.5"/><circle cx="112" cy="34" r="9" fill="none" stroke="#8a5a3a" stroke-width="1.5"/></svg>';
  var SCAN = '<svg class="pf-scan" viewBox="0 0 120 80" aria-hidden="true"><rect x="14" y="10" width="92" height="52" rx="5" fill="#e9ebf5"/><rect x="14" y="10" width="92" height="9" rx="4" fill="#cfd3e6"/><rect x="22" y="26" width="32" height="8" rx="2" fill="#19d28c"/><rect x="22" y="40" width="52" height="5" rx="2" fill="#b9bed8"/><rect x="22" y="50" width="40" height="5" rx="2" fill="#b9bed8"/><g class="pf-lens"><circle cx="78" cy="46" r="11" fill="rgba(255,255,255,.55)" stroke="#2d3157" stroke-width="3"/><path d="m86 54 10 10" stroke="#2d3157" stroke-width="4" stroke-linecap="round"/></g></svg>';

  function ProductDemo(container) {
    var logo = container.getAttribute('data-logo') || 'genxflo-logo.svg';
    var seq = 100;
    var scale = 1;
    var zoom = 1;
    var tab = 'nodes';
    var timers = [];
    var ghost = null;
    var toastTimer = 0;
    var sugEl = null;
    var sugInput = null;
    var state = { nodes: [], edges: [] };
    var hist = [];
    var custom = [];
    var tool = null;
    var screen = 'dash';
    var wiz = blankWiz();
    var pipes = [
      { id: 'p1', name: 'rnaseq_standard', desc: 'rnaseq_standard workflow -', status: 'ok', ver: 'v1.1', graph: graph('rna'), preview: false },
      { id: 'p2', name: 'rnaseq_salmon_differential_wout', desc: 'rnaseq - salmon + pytximport + pydeseq2', status: 'ok', ver: 'v1.1', graph: graph('salmon'), preview: false }
    ];

    container.classList.add('pf-host');
    container.innerHTML =
      '<div class="pf-sizer"><div class="pf-stage pf-s-dash">' +
      '<div class="pf-top"><img class="pf-logo" src="' + logo + '" alt="GenXflo"><span class="pf-back" data-act="dash" role="button" tabindex="0">' + ph('squares-four') + 'Back to Dashboard</span>' +
      '<span class="pf-top-links"><span>Home</span><span>Documentation</span><span class="pf-avatar">S</span></span></div>' +
      '<div class="pf-screen pf-dash"></div>' +
      '<div class="pf-screen pf-form"></div>' +
      '<div class="pf-screen pf-edit">' +
      '<div class="pf-rail">' + rb('undo', 'undo', '', 'Undo', 'pf-top1') + rb('nodes', 'tab', 'nodes', 'Nodes', 'pf-t pf-t1') + rb('tool', 'tab', 'tools', 'Tools', 'pf-t pf-t2') + rb('custom', 'tab', 'custom', 'Custom tools', 'pf-t pf-t3') +
      rb('zin', 'zin', '', 'Zoom in', 'pf-b3') + rb('zout', 'zout', '', 'Zoom out', 'pf-b2') + rb('box', 'fit', '', 'Fit view', 'pf-b1') + '</div>' +
      '<div class="pf-side"><div class="pf-search">' + ph('magnifying-glass') + '<input type="text" data-f="q" placeholder="Search Component" aria-label="Search component"></div><div class="pf-sidebody"></div></div>' +
      '<div class="pf-canvas"><div class="pf-world"><svg class="pf-edges" width="' + CW + '" height="' + CH + '"><defs><marker id="pf-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="#aeb3d1"/></marker></defs></svg><div class="pf-nodes"></div></div>' +
      '<div class="pf-empty">Drag a node from the left panel onto the canvas to start</div>' +
      '<div class="pf-tray"><button type="button" class="pf-btn" data-act="reset">Reset</button><button type="button" class="pf-btn" data-act="validate">Submit and Validate</button><button type="button" class="pf-btn" data-act="template">Save as Template</button></div></div>' +
      '</div>' +
      '<div class="pf-modal"><div class="pf-card"></div></div>' +
      '<div class="pf-toast" role="status"></div>' +
      '</div></div>';

    var sizer = container.querySelector('.pf-sizer');
    var stage = container.querySelector('.pf-stage');
    var dash = container.querySelector('.pf-dash');
    var form = container.querySelector('.pf-form');
    var side = container.querySelector('.pf-sidebody');
    var search = container.querySelector('[data-f="q"]');
    var canvas = container.querySelector('.pf-canvas');
    var world = container.querySelector('.pf-world');
    var svg = container.querySelector('.pf-edges');
    var layer = container.querySelector('.pf-nodes');
    var empty = container.querySelector('.pf-empty');
    var toast = container.querySelector('.pf-toast');
    var modal = container.querySelector('.pf-modal');
    var card = container.querySelector('.pf-card');

    function blankWiz() {
      return { name: '', desc: '', mode: 'empty', builtin: '', out: '', ack: false, samples: [{ id: '', type: '', path: '', fmt: '' }, { id: '', type: '', path: '', fmt: '' }] };
    }

    // ---------- sample graphs (used by the built-in workflows and the dashboard cards)
    function graph(kind) {
      var nodes = [];
      var edges = [];
      function N(type, label, x, y) {
        var n = { id: 'g' + (++seq), type: type, label: label, x: x, y: y, open: false, saved: true, uid: rnd(), args: [], argv: {}, mode: (MODES[label] || [label.toLowerCase()])[0] };
        if (type === 'block') n.sel = [SAMPLES[0]];
        if (type === 'resource') { n.rname = 'genome'; n.rpath = '/data/ref/genome.fa'; }
        nodes.push(n);
        return n;
      }
      function E(a, b) { edges.push([a.id, b.id]); }
      var b = N('block', LABELS.block, 40, 150);
      var r = N('resource', LABELS.resource, 40, 340);
      if (kind === 'salmon') {
        var f2 = N('tool', 'FastP', 300, 120); var s = N('tool', 'Salmon', 540, 230); var d = N('tool', 'pydeseq2', 780, 230);
        E(b, f2); E(f2, s); E(r, s); E(s, d);
      } else if (kind === 'wgs') {
        var f3 = N('tool', 'FastP', 300, 110); var bw = N('tool', 'BWA', 530, 230); var sm = N('tool', 'Samtools', 740, 230); var fb = N('tool', 'Freebayes', 900, 230);
        E(b, f3); E(f3, bw); E(r, bw); E(bw, sm); E(sm, fb);
      } else {
        var q = N('tool', 'FastQC', 300, 60); var f = N('tool', 'FastP', 300, 170); var h = N('tool', 'Hisat2', 530, 250); var st = N('tool', 'Samtools', 730, 250); var fc = N('tool', 'featureCounts', 890, 250);
        E(b, q); E(b, f); E(f, h); E(r, h); E(h, st); E(st, fc);
      }
      return { nodes: nodes, edges: edges };
    }

    function fit() {
      var width = container.clientWidth;
      scale = Math.min(1, width / W);
      stage.style.transform = 'scale(' + scale + ')';
      sizer.style.width = W * scale + 'px';
      sizer.style.height = H * scale + 'px';
    }

    function notify(text, ok) {
      toast.textContent = text;
      toast.className = 'pf-toast pf-show' + (ok ? ' pf-ok' : '');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.className = 'pf-toast'; }, 2400);
    }

    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }

    // ---------- screens
    function show(name) {
      screen = name;
      stage.className = 'pf-stage pf-s-' + name;
      hideSug();
      if (name === 'dash') renderDash();
      if (name === 'form') renderForm(0);
      if (name === 'edit') { renderSide(); renderNodes(); applyZoom(); }
    }

    // ---------- dashboard
    function renderDash() {
      var keep = dash.scrollTop;
      var cards = pipes.map(cardHtml).join('');
      var prev = pipes.map(function (p) { return prevHtml(p); }).join('');
      dash.innerHTML = '<button type="button" class="pf-create' + (wiz.pulse === false ? '' : ' pf-pulse') + '" data-act="create">Create new pipeline</button>' +
        '<div class="pf-grid">' + cards +
        '<div class="pf-import" data-act="import" role="button" tabindex="0">' + ph('download-simple') + '<span>Import Pipeline</span></div>' + prev + '</div>';
      dash.scrollTop = keep;
    }

    function cardHtml(p) {
      var run = p.status === 'run';
      return '<div class="pf-pcard" data-id="' + p.id + '"><div class="pf-pic">' + ph('export', 'data-act="share" title="Share"') + ph('pencil-simple', 'data-act="edit" title="Edit"') + ph('trash', 'data-act="delete" title="Delete"') + '</div>' +
        '<h6>' + esc(p.name) + '</h6><small>Description</small><p>' + esc(p.desc) + '</p>' +
        '<div class="pf-bar"><span class="' + (run ? 'pf-run' : '') + '" style="width:' + (run ? p.pct : 100) + '%"></span></div><em class="pf-st">' + (run ? 'In Progress' : 'Succeeded') + '</em>' +
        '<div class="pf-prow"><button type="button" data-act="schema">View Schema</button>' + (run ? '' : '<button type="button" data-act="download">Download file</button>') +
        '<select data-f="ver" aria-label="Version"><option' + (p.ver === 'v1.0' ? ' selected' : '') + '>v1.0</option><option' + (p.ver === 'v1.1' ? ' selected' : '') + '>v1.1</option></select></div></div>';
    }

    function prevHtml(p) {
      if (!p.preview) return '<div class="pf-prev" data-id="' + p.id + '"><span>No Preview</span></div>';
      var g = p.graph;
      var byId = {};
      g.nodes.forEach(function (n) { byId[n.id] = n; });
      var s = '<svg viewBox="0 0 ' + CW + ' ' + CH + '" preserveAspectRatio="xMidYMid meet">';
      g.edges.forEach(function (e) {
        var a = byId[e[0]]; var b = byId[e[1]];
        if (!a || !b) return;
        var x1 = a.x + 150; var y1 = a.y + 27; var x2 = b.x; var y2 = b.y + 27; var dx = Math.max(30, (x2 - x1) / 2);
        s += '<path d="M' + x1 + ',' + y1 + ' C' + (x1 + dx) + ',' + y1 + ' ' + (x2 - dx) + ',' + y2 + ' ' + x2 + ',' + y2 + '" fill="none" stroke="#8d92b8" stroke-width="3"/>';
      });
      g.nodes.forEach(function (n) {
        s += '<rect x="' + n.x + '" y="' + n.y + '" width="150" height="54" rx="12" fill="#181b34" stroke="#19d28c" stroke-width="2"/><text x="' + (n.x + 75) + '" y="' + (n.y + 33) + '" fill="#fff" font-size="19" font-weight="700" text-anchor="middle" font-family="Manrope,sans-serif">' + esc(n.label) + '</text>';
      });
      return '<div class="pf-prev pf-has" data-id="' + p.id + '">' + s + '</svg></div>';
    }

    function pipeOf(target) {
      var c = target.closest('[data-id]');
      var id = c && c.getAttribute('data-id');
      for (var i = 0; i < pipes.length; i++) if (pipes[i].id === id) return pipes[i];
      return null;
    }

    // ---------- create pipeline form
    function renderForm(keep) {
      var sampleRows = wiz.samples.map(function (s, i) {
        return '<div class="pf-trow"><input data-w="s-id" data-i="' + i + '" placeholder="sampleId" value="' + esc(s.id) + '"><select data-w="s-type" data-i="' + i + '"><option value="">Select sample type</option><option' + (s.type === 'Paired-end' ? ' selected' : '') + '>Paired-end</option><option' + (s.type === 'Single-end' ? ' selected' : '') + '>Single-end</option></select>' +
          '<input data-w="s-path" data-i="' + i + '" placeholder="/path/to/reads/" value="' + esc(s.path) + '"><input data-w="s-fmt" data-i="' + i + '" placeholder="*_{R1,R2}.fastq.gz" value="' + esc(s.fmt) + '"><button type="button" class="pf-x" data-act="del-row" data-i="' + i + '" aria-label="Remove row">&times;</button></div>';
      }).join('');
      var opts = '<option value="">Select Built-in Workflow</option>' + Object.keys(BUILTIN).map(function (k) { return '<option' + (wiz.builtin === k ? ' selected' : '') + '>' + k + '</option>'; }).join('');
      form.innerHTML = '<div class="pf-fcard">' +
        '<button type="button" class="pf-eg" data-act="w-example">Use example values</button>' +
        '<h3>Provide Pipeline Details</h3><p class="pf-fsub">Enter the pipeline details for a more precise and customized workflow.</p>' +
        '<label class="pf-lbl">Pipeline Name <em>*</em></label><div class="pf-fld"><input class="pf-inp" data-w="name" data-sug="names" placeholder="Enter pipeline name" autocomplete="off" value="' + esc(wiz.name) + '"></div>' +
        '<label class="pf-lbl">Pipeline Description <em>*</em></label><textarea class="pf-inp pf-ta" data-w="desc" placeholder="Enter pipeline description">' + esc(wiz.desc) + '</textarea>' +
        '<div class="pf-box"><p>Do you want to start from a built-in workflow or from an empty canvas?</p>' +
        '<div class="pf-radio"><label data-act="w-mode" data-v="builtin"><i class="pf-rd' + (wiz.mode === 'builtin' ? ' on' : '') + '"></i>Built-in workflows</label><select class="pf-inp pf-sel2" data-w="builtin">' + opts + '</select></div>' +
        '<div class="pf-radio"><label data-act="w-mode" data-v="empty"><i class="pf-rd' + (wiz.mode === 'empty' ? ' on' : '') + '"></i>Empty canvas</label></div></div>' +
        '<label class="pf-lbl">Sample sheet</label><div class="pf-tbl"><div class="pf-trow pf-thead"><span>Sample ID</span><span>Sample Type</span><span>Input Paths <i class="pf-dot"></i></span><span>Input Path Format <i class="pf-dot"></i></span><button type="button" class="pf-plus" data-act="add-row" aria-label="Add row">+</button></div>' + sampleRows + '</div>' +
        '<button type="button" class="pf-addrow" data-act="add-row">+ Add Row</button>' +
        '<label class="pf-lbl">Please provide the output folder path <em>*</em></label><input class="pf-inp" data-w="out" placeholder="/output_dir/pipeline_name/" value="' + esc(wiz.out) + '">' +
        '<p class="pf-ai">This application uses AI to validate content. While it aims to provide helpful and accurate information, the output may sometimes be incorrect, incomplete, or unpredictable. Please verify critical details independently before relying on the results.</p>' +
        '<label class="pf-ack" data-act="w-ack"><i class="pf-cbx' + (wiz.ack ? ' on' : '') + '"></i>I understand</label>' +
        '<div class="pf-fbtns"><button type="button" class="pf-ob" data-act="w-reset">Reset</button><button type="button" class="pf-ob pf-next" data-act="w-next">Next</button></div></div>';
      form.scrollTop = keep || 0;
      updateNext();
    }

    function wizOk() { return !!(wiz.name.trim() && wiz.desc.trim() && wiz.out.trim() && wiz.ack); }
    function updateNext() {
      var b = form.querySelector('.pf-next');
      if (b) b.classList.toggle('pf-dis', !wizOk());
    }

    // ---------- editor: side panel
    function renderSide() {
      var q = (search.value || '').toLowerCase();
      var html = '';
      container.querySelectorAll('.pf-t').forEach(function (b) { b.classList.toggle('pf-on', b.getAttribute('data-v') === tab); });
      function item(k, t) { return '<div class="pf-tool" data-k="' + esc(k) + '">' + esc(t) + '</div>'; }
      function match(t) { return !q || t.toLowerCase().indexOf(q) > -1; }
      if (tab === 'nodes') {
        [['node:sample', LABELS.sample], ['node:block', LABELS.block], ['node:resource', LABELS.resource]].forEach(function (i) { if (match(i[1])) html += item(i[0], i[1]); });
      } else if (tab === 'tools') {
        TOOLS.forEach(function (t) { if (match(t)) html += item('tool:' + t, t); });
      } else {
        html += '<div class="pf-ie"><span data-act="import-tool">' + ph('download-simple') + 'Import</span><span data-act="export-tool">' + ph('upload-simple') + 'Export</span></div><button type="button" class="pf-add" data-act="add-tool">Add Tool</button>';
        custom.forEach(function (c, i) { if (match(c.name)) html += '<div class="pf-cwrap">' + ph('pencil-simple', 'class="pf-cedit" data-act="edit-tool" data-v="' + i + '" title="Edit tool"') + item('custom:' + i, c.name) + '</div>'; });
      }
      if (!html) html = '<p class="pf-none">No components found</p>';
      side.innerHTML = html;
      side.scrollTop = 0;
    }

    // ---------- editor: graph helpers
    function find(id) {
      for (var i = 0; i < state.nodes.length; i++) if (state.nodes[i].id === id) return state.nodes[i];
      return null;
    }
    function incoming(n) { return state.edges.filter(function (e) { return e[1] === n.id; }).map(function (e) { return find(e[0]); }).filter(Boolean); }
    function upstream(n, seen) {
      seen = seen || {};
      var out = [];
      incoming(n).forEach(function (p) {
        if (seen[p.id]) return;
        seen[p.id] = 1;
        out.push(p);
        out = out.concat(upstream(p, seen));
      });
      return out;
    }
    function hasIn(n) { return n.type === 'tool' || n.type === 'custom'; }
    function nm(n) { return hasIn(n) ? n.label + '_' + n.uid : n.label; }

    function issues(n) {
      var out = [];
      if (n.type === 'block' || n.type === 'sample') {
        if (!n.saved) out.push(n.label + ': select the sample(s) and press Save.');
      } else if (n.type === 'resource') {
        if (!n.saved) out.push('Resource Node: set the resource name and path, then press Save.');
      } else if (!incoming(n).length) {
        out.push(nm(n) + ' has no input connected.');
      } else if (NEEDS_REF[n.label] && !upstream(n).some(function (u) { return u.type === 'resource' && u.saved; })) {
        out.push(nm(n) + ' needs a reference: connect a saved Resource Node.');
      }
      return out;
    }

    function samIssues() {
      var out = [];
      state.nodes.forEach(function (n) {
        if (n.type !== 'custom' || n.inExt !== '.bam') return;
        incoming(n).forEach(function (u) {
          if (u.type === 'tool' && ALIGNERS[u.label]) out.push(nm(n) + ' requires BAM input (' + (n.inFlag || '-bam') + '), but upstream ' + nm(u) + ' produces SAM; add a SAM-to-BAM conversion (e.g., samtools view/sort) before ' + n.label + '. Other dependencies and required flags are correctly wired.');
        });
      });
      return out;
    }

    function snap() {
      hist.push(JSON.stringify(state));
      if (hist.length > 40) hist.shift();
    }

    function outPt(n) { return { x: n.x + (n.w || 147), y: n.y + (n.h || 55) / 2 }; }
    function inPt(n) { return { x: n.x, y: n.y + (n.h || 55) / 2 }; }
    function pathFor(a, b) {
      var dx = Math.max(40, Math.abs(b.x - a.x) * 0.5);
      return 'M' + a.x + ',' + a.y + ' C' + (a.x + dx) + ',' + a.y + ' ' + (b.x - dx) + ',' + b.y + ' ' + b.x + ',' + b.y;
    }

    function drawEdges() {
      svg.querySelectorAll('.pf-edge, .pf-hit').forEach(function (p) { p.remove(); });
      state.edges.forEach(function (edge, index) {
        var from = find(edge[0]);
        var to = find(edge[1]);
        if (!from || !to) return;
        var d = pathFor(outPt(from), inPt(to));
        var line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('class', 'pf-edge');
        line.setAttribute('d', d);
        line.setAttribute('marker-end', 'url(#pf-arrow)');
        var hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hit.setAttribute('class', 'pf-hit');
        hit.setAttribute('d', d);
        hit.addEventListener('click', function () { snap(); state.edges.splice(index, 1); renderNodes(); });
        svg.appendChild(line);
        svg.appendChild(hit);
      });
    }

    // ---------- editor: nodes
    function nodeInner(n) {
      var iss = issues(n);
      var ports = (hasIn(n) ? '<i class="pf-port pf-in" data-id="' + n.id + '"></i>' : '') + '<i class="pf-port pf-out" data-id="' + n.id + '"></i>';
      var tb = '<div class="pf-tb">' + ph('info', 'data-act="info" title="Info"') + ph('pencil-simple', 'data-act="toggle" title="Configure"') + ph('trash', 'data-act="del" title="Delete"') + '</div>';
      if (!n.open) {
        return tb + '<div class="pf-select pf-nhead"><span>' + esc(n.label) + '</span>' + (iss.length ? '<b class="pf-badge" title="' + esc(iss.join(' ')) + '">' + iss.length + '</b>' : '') + ph('caret-down', 'data-act="toggle"') + '</div>' + ports;
      }
      var body = '';
      var head = '';
      if (n.type === 'block' || n.type === 'sample') {
        var ids = sampleIds();
        var chips = n.sel.map(function (s) { return '<span class="pf-chip">' + esc(s) + '<u data-act="chip-x" data-v="' + esc(s) + '">&times;</u></span>'; }).join('') || '<span class="pf-ph">Select samples</span>';
        head = '<b>' + n.label + '</b>';
        body = '<label class="pf-nl">' + (n.type === 'block' ? 'Select Sample(s)' : 'Select Sample') + ' <i class="pf-help">?</i></label><div class="pf-ms" data-act="ms-toggle"><div class="pf-chips">' + chips + '</div>' + ph('caret-down') + '</div>' +
          (n.msOpen ? '<div class="pf-msl">' + ids.map(function (s) { return '<div class="pf-opt" data-act="ms-opt" data-v="' + esc(s) + '"><i class="pf-cb' + (n.sel.indexOf(s) > -1 ? ' on' : '') + '"></i>' + esc(s) + '</div>'; }).join('') + '</div>' : '') +
          (n.err ? '<p class="pf-nerr">' + esc(n.err) + '</p>' : '') + '<button type="button" class="pf-save" data-act="save">Save</button>';
      } else if (n.type === 'resource') {
        head = '<b>Resource Node</b>';
        body = '<label class="pf-nl">Resource Name <em>*</em> <i class="pf-help">?</i></label><div class="pf-fld"><input class="pf-ni" data-f="rname" data-sug="res" autocomplete="off" placeholder="e.g: genome.fa" value="' + esc(n.rname) + '"></div>' +
          '<label class="pf-nl">Resource Path <em>*</em> <i class="pf-help">?</i></label><div class="pf-fld"><input class="pf-ni" data-f="rpath" placeholder="e.g: /opt/genxflo/references/genome.fa" value="' + esc(n.rpath) + '"></div>' +
          (n.err ? '<p class="pf-nerr">' + esc(n.err) + '</p>' : '') + '<button type="button" class="pf-save" data-act="save">Save</button>';
      } else {
        var modes = (MODES[n.label] || [n.mode || n.label.toLowerCase()]).map(function (m) { return '<option' + (n.mode === m ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('');
        var refs = upstream(n).filter(function (u) { return u.type === 'resource' && u.saved; }).map(function (u) { return '<div class="pf-refrow"><i class="pf-cb on"></i>' + esc(u.rpath) + '</div>'; }).join('') || '<span class="pf-ph">Connect a Resource Node</span>';
        head = '<span class="pf-nn">' + esc(nm(n)) + '</span>' + ph('trash', 'class="pf-red" data-act="del"');
        body = '<div class="pf-sec2"><b>Modes</b><select class="pf-ni" data-f="mode">' + modes + '</select></div>' +
          '<div class="pf-sec2 pf-col"><b>Reference <em>*</em></b><div class="pf-refbox">' + refs + '</div></div>' +
          '<div class="pf-sec2 pf-col"><b>Argument List</b><div class="pf-srch">' + ph('magnifying-glass') + '<input data-f="asearch" placeholder="Search..." value="' + esc(n.asearch || '') + '"></div><div class="pf-alist">' + argList(n) + '</div></div>' +
          '<div class="pf-sec2 pf-col"><b>Selected Arguments</b><div class="pf-selargs">' + selArgs(n) + '</div></div>';
      }
      return '<div class="pf-bhead pf-nhead">' + head + ph('caret-up', 'data-act="toggle"') + '</div><div class="pf-nbody">' + body + '</div>' + ports;
    }

    function argList(n) {
      var q = (n.asearch || '').toLowerCase();
      return (ARGS[n.label] || ARGS_DEF).filter(function (a) { return n.args.indexOf(a) < 0 && (!q || a.toLowerCase().indexOf(q) > -1); }).map(function (a) { return '<div class="pf-arg" data-act="arg-add" data-v="' + esc(a) + '">' + esc(a) + '</div>'; }).join('') || '<span class="pf-ph">No arguments</span>';
    }
    function selArgs(n) {
      return n.args.map(function (a) { return '<div class="pf-srow"><span>' + esc(a) + '</span><input data-f="argval" data-v="' + esc(a) + '" placeholder="value" value="' + esc(n.argv[a] || '') + '"><u data-act="arg-x" data-v="' + esc(a) + '">&times;</u></div>'; }).join('') || '<span class="pf-ph">Click an argument above to add it</span>';
    }

    function sampleIds() {
      var ids = wiz.samples.map(function (s) { return s.id.trim(); }).filter(Boolean);
      return ids.length ? ids : SAMPLES;
    }

    function renderNodes() {
      layer.innerHTML = '';
      state.nodes.forEach(function (n) {
        var iss = issues(n);
        var wide = n.type === 'block' || n.type === 'sample' || n.type === 'resource';
        var cls = 'pf-node ' + (n.open ? 'pf-big pf-big-' + (hasIn(n) ? 'tool' : 'node') : 'pf-proc' + (wide ? ' pf-wide' : '')) + (iss.length ? ' pf-err' : '');
        var node = el('div', cls, nodeInner(n));
        node.setAttribute('data-id', n.id);
        node.style.left = n.x + 'px';
        node.style.top = n.y + 'px';
        layer.appendChild(node);
        n.w = node.offsetWidth;
        n.h = node.offsetHeight;
        var nx = Math.max(0, Math.min(CW - n.w - 6, n.x));
        var ny = Math.max(0, Math.min(CH - n.h - 6, n.y));
        if (nx !== n.x || ny !== n.y) { n.x = nx; n.y = ny; node.style.left = nx + 'px'; node.style.top = ny + 'px'; }
      });
      empty.style.display = state.nodes.length ? 'none' : 'block';
      drawEdges();
    }

    function applyZoom() { world.style.transform = 'scale(' + zoom + ')'; }

    function toLocal(event) {
      var rect = world.getBoundingClientRect();
      return { x: (event.clientX - rect.left) / (scale * zoom), y: (event.clientY - rect.top) / (scale * zoom) };
    }

    function mkNode(key, x, y) {
      var p = key.split(':');
      var t = p[0];
      var v = p.slice(1).join(':');
      var n = { id: 'n' + (++seq), x: x, y: y, open: false, saved: false, uid: rnd(), args: [], argv: {} };
      if (t === 'node') {
        n.type = v; n.label = LABELS[v]; n.sel = []; n.rname = ''; n.rpath = ''; n.open = true;
      } else if (t === 'tool') {
        n.type = 'tool'; n.label = v; n.mode = (MODES[v] || [v.toLowerCase()])[0];
      } else {
        var c = custom[+v];
        n.type = 'custom'; n.label = c.name; n.inExt = c.inExt; n.inFlag = c.inFlag; n.mode = c.mode;
      }
      return n;
    }

    // ---------- suggestions popover
    function sugList(inp) {
      var k = inp.getAttribute('data-sug');
      if (k === 'names') return NAME_SUG;
      if (k === 'res') return RES_SUG;
      if (k === 'ext') return EXT_SUG;
      if (k === 'flag') {
        var c = (tool && tool.cmd) || '';
        return ['-bam', c ? c + ' -bam' : '-input', c || '-i'];
      }
      return [];
    }
    function showSug(inp) {
      hideSug();
      var q = inp.value.toLowerCase();
      var key = q.slice(0, 3);
      var m = sugList(inp).filter(function (i) { return i.toLowerCase().indexOf(key) > -1 && i.toLowerCase() !== q; });
      if (!m.length) return;
      sugEl = el('div', 'pf-sug', m.slice(0, 6).map(function (i) { return '<div class="pf-sug-i" data-v="' + esc(i) + '">' + esc(i) + '</div>'; }).join(''));
      inp.parentNode.appendChild(sugEl);
      sugInput = inp;
    }
    function hideSug() {
      if (sugEl && sugEl.parentNode) sugEl.parentNode.removeChild(sugEl);
      sugEl = null; sugInput = null;
    }

    // ---------- Add Tool dialog
    function blankTool() {
      return { name: '', mode: '', cmd: '', repo: '', pkg: '', doc: '', type: '', ver: '', inKind: 'keyword', inFlag: '', inExt: '', outKind: 'keyword', outFlag: '', outExt: '', refArg: false, extra: 0, tried: false, edit: -1 };
    }
    function openToolDialog(i) {
      tool = blankTool();
      if (i != null && custom[i]) { tool = JSON.parse(JSON.stringify(custom[i].form)); tool.edit = i; tool.tried = false; }
      renderToolDialog(0);
      modal.classList.add('pf-open');
    }
    function req(v) { return v && String(v).trim(); }
    function bad(t, k) { return t.tried && !req(t[k]); }
    function renderToolDialog(keep) {
      var t = tool;
      function fld(label, k, ph2, opt) {
        var sug = opt && opt.sug ? ' data-sug="' + opt.sug + '" autocomplete="off"' : '';
        return '<label class="pf-tl">' + label + ' <i class="pf-help">?</i></label><div class="pf-fld"><input class="pf-ti' + (bad(t, k) ? ' pf-bad' : '') + '" data-t="' + k + '"' + sug + ' placeholder="' + ph2 + '" value="' + esc(t[k]) + '"></div>' + (bad(t, k) ? '<p class="pf-bm">This field is required.</p>' : '');
      }
      function radios(group, a, b) {
        return '<div class="pf-tr"><label data-act="t-radio" data-g="' + group + '" data-v="keyword"><i class="pf-rd' + (t[group] === 'keyword' ? ' on' : '') + '"></i>Keyword</label><label data-act="t-radio" data-g="' + group + '" data-v="positional"><i class="pf-rd' + (t[group] === 'positional' ? ' on' : '') + '"></i>Positional</label></div>';
      }
      var html = '<div class="pf-dh"><b>Add new component</b><i class="pf-x2" data-act="modal-close" role="button" aria-label="Close">' + ph('x-circle') + '</i></div><div class="pf-dbody">' +
        fld('Name displayed on UI <em>*</em>', 'name', 'e.g. qualimap') + fld('Defines the mode in which the tool runs <em>*</em>', 'mode', 'e.g. bamqc') + fld('Command used to run on the CLI <em>*</em>', 'cmd', 'e.g. qualimap') +
        '<p class="pf-tl2">Choose repository:</p><div class="pf-tr">' + ['Bioconda', 'Bioarch', 'Other'].map(function (r) { return '<label data-act="t-repo" data-v="' + r + '"><i class="pf-rd' + (t.repo === r ? ' on' : '') + '"></i>' + r + '</label>'; }).join('') + '</div>' + (bad(t, 'repo') ? '<p class="pf-bm">Please select a repository for building the tool</p>' : '') +
        fld('The name of the package as listed in supported repositories <em>*</em>', 'pkg', 'e.g. qualimap') +
        '<label class="pf-tl">Documentation link <i class="pf-help">?</i></label><div class="pf-fld"><input class="pf-ti" data-t="doc" placeholder="Documentation link" value="' + esc(t.doc) + '"></div><button type="button" class="pf-fill" data-act="t-fill">Auto-Fill with AI</button>' +
        '<div class="pf-trow2"><b>Select the type of tool</b><select class="pf-ti' + (bad(t, 'type') ? ' pf-bad' : '') + '" data-t="type"><option value="">--Select an option--</option>' + TYPES.map(function (o) { return '<option' + (t.type === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>' + (bad(t, 'type') ? '<p class="pf-bm">This field is required.</p>' : '') +
        '<label class="pf-tl">Tool version <i class="pf-help">?</i></label><div class="pf-fld"><input class="pf-ti" data-t="ver" placeholder="Please fill the tool version details" value="' + esc(t.ver) + '"></div>' +
        '<p class="pf-tl2">Input</p>' + radios('inKind') + '<div class="pf-two"><div><label class="pf-tl">Input <em>*</em></label><div class="pf-fld"><input class="pf-ti' + (bad(t, 'inFlag') ? ' pf-bad' : '') + '" data-t="inFlag" data-sug="flag" autocomplete="off" placeholder="-input" value="' + esc(t.inFlag) + '"></div>' + (bad(t, 'inFlag') ? '<p class="pf-bm">This field is required.</p>' : '') + '</div>' +
        '<div><label class="pf-tl">Input file extension <em>*</em></label><div class="pf-fld"><input class="pf-ti' + (bad(t, 'inExt') ? ' pf-bad' : '') + '" data-t="inExt" data-sug="ext" autocomplete="off" placeholder=".vcf" value="' + esc(t.inExt) + '"></div>' + (bad(t, 'inExt') ? '<p class="pf-bm">This field is required.</p>' : '') + '</div></div>' +
        '<p class="pf-tl2">Output</p>' + radios('outKind') + '<div class="pf-two"><div><label class="pf-tl">Output <em>*</em></label><div class="pf-fld"><input class="pf-ti' + (bad(t, 'outFlag') ? ' pf-bad' : '') + '" data-t="outFlag" placeholder="--output" value="' + esc(t.outFlag) + '"></div>' + (bad(t, 'outFlag') ? '<p class="pf-bm">This field is required.</p>' : '') + '</div>' +
        '<div><label class="pf-tl">Output file extension <em>*</em></label><div class="pf-fld"><input class="pf-ti' + (bad(t, 'outExt') ? ' pf-bad' : '') + '" data-t="outExt" data-sug="ext" autocomplete="off" placeholder=".sam" value="' + esc(t.outExt) + '"></div>' + (bad(t, 'outExt') ? '<p class="pf-bm">This field is required.</p>' : '') + '</div></div>' +
        '<label class="pf-tck" data-act="t-ref"><i class="pf-cbx' + (t.refArg ? ' on' : '') + '"></i>Add Reference argument</label>' +
        new Array(t.extra + 1).join('<div class="pf-two pf-extra"><div><input class="pf-ti" placeholder="--argument"></div><div><input class="pf-ti" placeholder="default value"></div></div>') +
        '<button type="button" class="pf-addarg" data-act="t-arg">+ Add argument</button></div>' +
        '<div class="pf-df"><button type="button" class="pf-ob pf-addbtn" data-act="t-add">' + (t.edit > -1 ? 'Save' : 'Add') + '</button></div>';
      card.className = 'pf-card pf-card-tool';
      card.innerHTML = html;
      var body = card.querySelector('.pf-dbody');
      if (body) body.scrollTop = keep || 0;
    }

    function submitTool() {
      tool.tried = true;
      var ok = ['name', 'mode', 'cmd', 'repo', 'pkg', 'type', 'inFlag', 'inExt', 'outFlag', 'outExt'].every(function (k) { return req(tool[k]); });
      if (!ok) {
        var body = card.querySelector('.pf-dbody');
        renderToolDialog(body ? body.scrollTop : 0);
        var firstBad = card.querySelector('.pf-bad, .pf-bm');
        if (firstBad && body) body.scrollTop = Math.max(0, firstBad.offsetTop - 120);
        return;
      }
      var entry = { name: tool.name.trim(), mode: tool.mode.trim(), inExt: tool.inExt.trim().toLowerCase(), inFlag: tool.inFlag.trim(), form: JSON.parse(JSON.stringify(tool)) };
      if (tool.edit > -1) custom[tool.edit] = entry; else custom.push(entry);
      closeModal();
      tab = 'custom';
      search.value = '';
      renderSide();
      notify(entry.name + ' added to your custom tools', true);
    }

    // ---------- modal helpers
    function openModal(html, cls) {
      card.className = 'pf-card ' + (cls || '');
      card.innerHTML = html;
      modal.classList.add('pf-open');
    }
    function closeModal() { modal.classList.remove('pf-open'); tool = null; }

    // ---------- validate flow
    var verdict = null;
    function runValidation() {
      if (!state.nodes.length) return notify('Add nodes to the canvas first', false);
      openModal('<h5 class="pf-vh">Validating Pipeline ...</h5><p class="pf-disc">' + DISC + '</p><div class="pf-vart">' + SCAN + '</div><div class="pf-vbtns"><button type="button" class="pf-go pf-off" disabled>Submit</button><button type="button" class="pf-link" data-act="modal-close">Cancel</button></div>', 'pf-card-v');
      var token = ++seq;
      verdict = token;
      later(function () {
        if (verdict !== token || !modal.classList.contains('pf-open')) return;
        var msgs = [];
        state.nodes.forEach(function (n) { msgs = msgs.concat(issues(n)); });
        msgs = msgs.concat(samIssues());
        if (msgs.length) {
          openModal('<h5 class="pf-vh">Validation Completed</h5><p class="pf-disc">' + DISC + '</p><div class="pf-vic pf-warn">!</div><div class="pf-vrow" data-act="vtoggle"><b>Invalid Pipeline</b>' + ph('caret-down') + '</div><div class="pf-vmsg">' + msgs.map(function (m) { return '<p>' + esc(m) + '</p>'; }).join('') + '</div><div class="pf-vbtns"><button type="button" class="pf-go" data-act="proceed">Proceed Regardless</button><button type="button" class="pf-link" data-act="modal-close">Cancel</button></div>', 'pf-card-v');
        } else {
          openModal('<h5 class="pf-vh">Validation Completed</h5><p class="pf-disc">' + DISC + '</p><div class="pf-vic pf-good">' + ph('check') + '</div><div class="pf-vrow pf-vok"><b>Valid Pipeline</b></div><div class="pf-vbtns"><button type="button" class="pf-go" data-act="proceed">Submit</button><button type="button" class="pf-link" data-act="modal-close">Cancel</button></div>', 'pf-card-v');
        }
      }, 1900);
    }

    function submitted() {
      openModal('<h5>Pipeline submitted successfully</h5>' + ART + '<b>Stitching in progress.</b><p>Meanwhile, Go to dashboard to track the progress</p><button type="button" class="pf-go" data-act="finish">Go to Dashboard</button>', 'pf-card-s');
    }

    function finish() {
      var name = (wiz.name || 'my_pipeline').trim();
      var p = { id: 'p' + (++seq), name: name, desc: (wiz.desc || 'custom pipeline').trim(), status: 'run', pct: 6, ver: 'v1.0', graph: JSON.parse(JSON.stringify(state)), preview: false };
      pipes.unshift(p);
      closeModal();
      wiz.pulse = false;
      show('dash');
      dash.scrollTop = 0;
      later(function () { setPct(p, 66); }, 80);
      later(function () {
        p.status = 'ok';
        if (screen === 'dash') renderDash();
      }, 9500);
    }

    function setPct(p, pct) {
      p.pct = pct;
      var c = dash.querySelector('.pf-pcard[data-id="' + p.id + '"] .pf-bar span');
      if (c) c.style.width = pct + '%';
    }

    function openEditor(graphObj) {
      state = graphObj ? JSON.parse(JSON.stringify(graphObj)) : { nodes: [], edges: [] };
      state.nodes.forEach(function (n) { n.open = false; n.id = n.id || 'n' + (++seq); });
      hist = [];
      zoom = 1;
      tab = state.nodes.length ? 'tools' : 'nodes';
      search.value = '';
      show('edit');
    }

    // ---------- pointer: drag from the side panel, move nodes, draw connections
    function onToolDown(event) {
      var item = event.target.closest('.pf-tool');
      if (!item || event.button > 0) return;
      event.preventDefault();
      var key = item.getAttribute('data-k');
      ghost = el('div', 'pf-ghost', item.textContent);
      document.body.appendChild(ghost);
      moveGhost(event);
      item.classList.add('pf-active');
      function move(e) { moveGhost(e); }
      function up(e) {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        item.classList.remove('pf-active');
        if (ghost) { ghost.remove(); ghost = null; }
        var rect = canvas.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          var p = toLocal(e);
          snap();
          var n = mkNode(key, p.x - 70, p.y - 27);
          state.nodes.push(n);
          renderNodes();
        }
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }

    function moveGhost(e) {
      if (ghost) ghost.style.transform = 'translate(' + (e.clientX - 12) + 'px,' + (e.clientY - 16) + 'px)';
    }

    function onCanvasDown(event) {
      if (event.button > 0) return;
      var port = event.target.closest('.pf-out');
      if (port) { startConnect(event, port.getAttribute('data-id')); return; }
      var head = event.target.closest('.pf-nhead');
      if (head && !event.target.closest('[data-act]')) startMove(event, head.closest('.pf-node'));
    }

    function startMove(event, nodeEl) {
      var n = find(nodeEl.getAttribute('data-id'));
      if (!n) return;
      var start = toLocal(event);
      var ox = n.x;
      var oy = n.y;
      var moved = false;
      nodeEl.classList.add('pf-lift');
      function move(e) {
        var p = toLocal(e);
        if (!moved) { snap(); moved = true; }
        n.x = Math.max(0, Math.min(CW - n.w, ox + p.x - start.x));
        n.y = Math.max(0, Math.min(CH - n.h, oy + p.y - start.y));
        nodeEl.style.left = n.x + 'px';
        nodeEl.style.top = n.y + 'px';
        drawEdges();
      }
      function up() {
        nodeEl.classList.remove('pf-lift');
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }

    function startConnect(event, fromId) {
      event.stopPropagation();
      event.preventDefault();
      var from = find(fromId);
      var a = outPt(from);
      var temp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      temp.setAttribute('class', 'pf-edge pf-temp');
      svg.appendChild(temp);
      function move(e) { temp.setAttribute('d', pathFor(a, toLocal(e))); }
      function up(e) {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        temp.remove();
        var hit = document.elementFromPoint(e.clientX, e.clientY);
        var target = hit && hit.closest('.pf-node');
        if (!target) return;
        var to = find(target.getAttribute('data-id'));
        if (!to || !hasIn(to) || to.id === fromId) return;
        var dup = state.edges.some(function (edge) { return edge[0] === fromId && edge[1] === to.id; });
        if (dup) return;
        snap();
        state.edges.push([fromId, to.id]);
        renderNodes();
      }
      move(event);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }

    // ---------- clicks
    function nodeOf(target) {
      var c = target.closest('.pf-node');
      return c ? find(c.getAttribute('data-id')) : null;
    }

    function onClick(event) {
      var t = event.target.closest('[data-act]');
      if (!t) {
        if (!event.target.closest('.pf-sug')) hideSug();
        if (event.target === modal) closeModal();
        return;
      }
      var act = t.getAttribute('data-act');
      var v = t.getAttribute('data-v');
      var n;
      switch (act) {
        // the pipeline-details form is switched off for now: it opens the drag-and-drop editor directly
        // case 'create': wiz = blankWiz(); wiz.pulse = false; show('form'); break;
        case 'create': wiz = blankWiz(); wiz.pulse = false; wiz.name = 'my_pipeline'; wiz.desc = 'custom pipeline built on the canvas'; openEditor(null); break;
        case 'dash': closeModal(); show('dash'); break;
        case 'share': notify('Pipeline link copied', true); break;
        case 'import': notify('Import opens a file picker in the full app', true); break;
        case 'delete': var dp = pipeOf(t); if (dp) { pipes = pipes.filter(function (p) { return p !== dp; }); renderDash(); notify(dp.name + ' deleted', true); } break;
        case 'edit': var ep = pipeOf(t); if (ep) { wiz = blankWiz(); wiz.name = ep.name; wiz.desc = ep.desc; wiz.pulse = false; openEditor(ep.graph); } break;
        case 'schema': var sp = pipeOf(t); if (sp) { sp.preview = !sp.preview; renderDash(); } break;
        case 'download': var dl = pipeOf(t); if (dl) openModal('<h5 class="pf-dlh">Download Pipeline</h5><p class="pf-dlp">Please ensure that Docker, GNU Make, and unzip are installed on the system executing this code.<br>If you encounter any issues while executing the code, refer to the available <u>resources</u> or feel free to <u>contact us</u> for assistance.</p><div class="pf-dlb"><button type="button" class="pf-go" data-act="dl-yes" data-n="' + esc(dl.name) + '">Download</button><button type="button" class="pf-go" data-act="modal-close">No</button></div>', 'pf-card-d'); break;
        case 'dl-yes': closeModal(); notify('Downloading ' + t.getAttribute('data-n') + '.zip', true); break;
        case 'w-example':
          wiz.name = 'wgs_qc_alignment'; wiz.desc = 'alignment and quality control of bam file from wgs reads'; wiz.out = '/output_dir/wgs_qc_alignment/'; wiz.ack = true;
          wiz.samples = [{ id: SAMPLES[0], type: 'Paired-end', path: '/data/wgs/', fmt: '*_{R1,R2}.fastq.gz' }, { id: SAMPLES[1], type: 'Paired-end', path: '/data/wgs/', fmt: '*_{R1,R2}.fastq.gz' }];
          renderForm(form.scrollTop); break;
        case 'w-mode': wiz.mode = v; renderForm(form.scrollTop); break;
        case 'w-ack': wiz.ack = !wiz.ack; var cb = form.querySelector('.pf-ack .pf-cbx'); if (cb) cb.classList.toggle('on', wiz.ack); updateNext(); break;
        case 'add-row': wiz.samples.push({ id: '', type: '', path: '', fmt: '' }); renderForm(form.scrollTop + 40); break;
        case 'del-row': if (wiz.samples.length > 1) { wiz.samples.splice(+t.getAttribute('data-i'), 1); renderForm(form.scrollTop); } break;
        case 'w-reset': var pulse = wiz.pulse; wiz = blankWiz(); wiz.pulse = pulse; renderForm(0); break;
        case 'w-next':
          if (!wizOk()) { notify('Fill in the required fields and tick “I understand”', false); break; }
          openEditor(wiz.mode === 'builtin' && BUILTIN[wiz.builtin] ? graph(BUILTIN[wiz.builtin]) : null);
          break;
        case 'tab': tab = v; search.value = ''; renderSide(); break;
        case 'undo': if (hist.length) { state = JSON.parse(hist.pop()); renderNodes(); } else notify('Nothing to undo', false); break;
        case 'zin': zoom = Math.min(1.6, +(zoom + 0.15).toFixed(2)); applyZoom(); break;
        case 'zout': zoom = Math.max(0.5, +(zoom - 0.15).toFixed(2)); applyZoom(); break;
        case 'fit': zoom = 1; applyZoom(); break;
        case 'reset': if (state.nodes.length) { snap(); state = { nodes: [], edges: [] }; renderNodes(); } notify('Canvas reset', true); break;
        case 'template': notify((wiz.name || 'pipeline') + '_template saved to your templates', true); break;
        case 'validate': runValidation(); break;
        case 'import-tool': notify('Import opens a file picker in the full app', true); break;
        case 'export-tool': notify(custom.length ? 'Custom tools exported' : 'No custom tools to export yet', !!custom.length); break;
        case 'add-tool': openToolDialog(); break;
        case 'edit-tool': openToolDialog(+v); break;
        case 'toggle': n = nodeOf(t); if (n) { n.open = !n.open; n.msOpen = false; n.err = ''; renderNodes(); } break;
        case 'del': n = nodeOf(t); if (n) { snap(); state.nodes = state.nodes.filter(function (x) { return x !== n; }); state.edges = state.edges.filter(function (e) { return e[0] !== n.id && e[1] !== n.id; }); renderNodes(); } break;
        case 'info': n = nodeOf(t); if (n) notify(n.label + (hasIn(n) ? ' · mode: ' + (n.mode || '') : ' · ' + (n.type === 'resource' ? 'reference file used by downstream tools' : 'chooses the samples to run')), true); break;
        case 'ms-toggle': n = nodeOf(t); if (n && !event.target.closest('[data-act="chip-x"]')) { n.msOpen = !n.msOpen; renderNodes(); } break;
        case 'ms-opt': n = nodeOf(t); if (n) { var i = n.sel.indexOf(v); if (i > -1) n.sel.splice(i, 1); else if (n.type === 'sample') n.sel = [v]; else n.sel.push(v); if (n.type === 'sample') n.msOpen = false; renderNodes(); } break;
        case 'chip-x': n = nodeOf(t); if (n) { n.sel = n.sel.filter(function (s) { return s !== v; }); n.saved = false; n.msOpen = false; renderNodes(); event.stopPropagation(); } break;
        case 'save':
          n = nodeOf(t);
          if (!n) break;
          if ((n.type === 'block' || n.type === 'sample') && !n.sel.length) { n.err = 'Select at least one sample.'; renderNodes(); break; }
          if (n.type === 'resource' && !(n.rname.trim() && n.rpath.trim())) { n.err = 'Resource name and path are required.'; renderNodes(); break; }
          snap(); n.saved = true; n.open = false; n.msOpen = false; n.err = ''; renderNodes(); break;
        case 'arg-add': n = nodeOf(t); if (n) { n.args.push(v); renderNodes(); } break;
        case 'arg-x': n = nodeOf(t); if (n) { n.args = n.args.filter(function (a) { return a !== v; }); renderNodes(); } break;
        case 't-radio': tool[t.getAttribute('data-g')] = v; renderToolDialog(card.querySelector('.pf-dbody').scrollTop); break;
        case 't-repo': tool.repo = v; renderToolDialog(card.querySelector('.pf-dbody').scrollTop); break;
        case 't-ref': tool.refArg = !tool.refArg; renderToolDialog(card.querySelector('.pf-dbody').scrollTop); break;
        case 't-arg': tool.extra++; renderToolDialog(1e5); break;
        case 't-fill':
          if (!tool.cmd && !tool.name) { notify('Enter the tool name or command first', false); break; }
          tool.pkg = tool.pkg || tool.cmd || tool.name.toLowerCase(); tool.doc = tool.doc || 'https://bioconda.github.io/recipes/' + tool.pkg + '/README.html'; tool.type = tool.type || 'Quality'; tool.ver = tool.ver || 'latest';
          renderToolDialog(card.querySelector('.pf-dbody').scrollTop); notify('Auto-filled with AI. Please review the details', true); break;
        case 't-add': submitTool(); break;
        case 'vtoggle': card.querySelector('.pf-vmsg').classList.toggle('pf-show'); t.classList.toggle('pf-openrow'); break;
        case 'proceed': submitted(); break;
        case 'finish': finish(); break;
        case 'modal-close': closeModal(); break;
        default: break;
      }
    }

    function onField(event) {
      var f = event.target;
      var key;
      if ((key = f.getAttribute('data-w'))) {
        var i = +f.getAttribute('data-i');
        if (key === 'name' || key === 'desc' || key === 'out') wiz[key] = f.value;
        else if (key === 'builtin') { wiz.builtin = f.value; if (f.value && wiz.mode !== 'builtin') { wiz.mode = 'builtin'; renderForm(form.scrollTop); return; } }
        else if (key === 's-id') wiz.samples[i].id = f.value;
        else if (key === 's-type') wiz.samples[i].type = f.value;
        else if (key === 's-path') wiz.samples[i].path = f.value;
        else if (key === 's-fmt') wiz.samples[i].fmt = f.value;
        updateNext();
      } else if ((key = f.getAttribute('data-t'))) {
        tool[key] = f.value;
        if (f.classList.contains('pf-bad') && f.value.trim()) f.classList.remove('pf-bad');
      } else if ((key = f.getAttribute('data-f'))) {
        if (key === 'q') { renderSide(); return; }
        if (key === 'ver') { var vp = pipeOf(f); if (vp) vp.ver = f.value; return; }
        var n = nodeOf(f);
        if (!n) return;
        if (key === 'rname') { n.rname = f.value; n.saved = false; }
        else if (key === 'rpath') { n.rpath = f.value; n.saved = false; }
        else if (key === 'mode') n.mode = f.value;
        else if (key === 'asearch') { n.asearch = f.value; var list = f.closest('.pf-node').querySelector('.pf-alist'); if (list) list.innerHTML = argList(n); }
        else if (key === 'argval') n.argv[f.getAttribute('data-v')] = f.value;
      }
      if (f.hasAttribute('data-sug') && event.type === 'input') showSug(f);
    }

    function onSugDown(event) {
      var item = event.target.closest('.pf-sug-i');
      if (!item) return;
      event.preventDefault();
      if (!sugInput) return;
      var inp = sugInput;
      inp.value = item.getAttribute('data-v');
      hideSug();
      onField({ target: inp, type: 'change' });
      if (inp.classList.contains('pf-bad')) inp.classList.remove('pf-bad');
    }

    function onFocusIn(event) {
      if (event.target.hasAttribute && event.target.hasAttribute('data-sug')) showSug(event.target);
    }
    function onFocusOut(event) {
      if (event.target.hasAttribute && event.target.hasAttribute('data-sug')) later(hideSug, 120);
    }
    function onKey(event) {
      if (event.key === 'Escape' && modal.classList.contains('pf-open')) closeModal();
      if ((event.key === 'Enter' || event.key === ' ') && event.target.getAttribute && event.target.getAttribute('role') === 'button') { event.preventDefault(); event.target.click(); }
    }

    stage.addEventListener('click', onClick);
    stage.addEventListener('input', onField);
    stage.addEventListener('change', onField);
    stage.addEventListener('focusin', onFocusIn);
    stage.addEventListener('focusout', onFocusOut);
    stage.addEventListener('pointerdown', onSugDown);
    stage.addEventListener('keydown', onKey);
    side.addEventListener('pointerdown', onToolDown);
    canvas.addEventListener('pointerdown', onCanvasDown);
    var ro = new ResizeObserver(fit);
    ro.observe(container);
    fit();
    show('dash');

    function reset() {
      closeModal();
      wiz = blankWiz();
      state = { nodes: [], edges: [] };
      hist = [];
      custom = [];
      pipes = pipes.filter(function (p) { return p.id === 'p1' || p.id === 'p2'; }).map(function (p) { p.preview = false; return p; });
      show('dash');
    }

    return {
      reset: reset,
      destroy: function () {
        ro.disconnect();
        timers.forEach(clearTimeout);
        if (ghost) ghost.remove();
        container.innerHTML = '';
        container.classList.remove('pf-host');
      }
    };
  }

  window.ProductDemo = ProductDemo;
  var slot = document.getElementById('hero-dash');
  if (slot) ProductDemo(slot);
})();
