/*
 * ProductDemo — an interactive replica of the GenXflo workflow builder.
 * Drag a tool from the list onto the canvas, move nodes, and connect them by
 * dragging from an output port to an input port. Click a line to remove it.
 *   const d = ProductDemo(containerElement);  d.reset();  d.destroy();
 */
(function () {
  'use strict';

  var W = 1280;
  var H = 602;
  var TOOLS = ['BWA', 'Cutadapt', 'FastP', 'Primer3', 'Dustmasker', 'Blast', 'FastQC', 'BBduk', 'Hisat2', 'Salmon', 'Star', 'Samtools', 'MultiQC', 'Dedupe', 'Freebayes', 'featureCounts', 'StringTie'];
  var PROC_W = 147;
  var PROC_H = 55;

  // canvas-local coordinates, taken from the product video
  function initial() {
    return {
      nodes: [
        { id: 'io', type: 'io', x: 46, y: 61, w: 279, h: 181 },
        { id: 'ref', type: 'ref', x: 46, y: 373, w: 279, h: 97 },
        { id: 'n1', type: 'proc', label: 'FastP', x: 437, y: 273 },
        { id: 'n2', type: 'proc', label: 'Hisat2', x: 437, y: 396 },
        { id: 'n3', type: 'proc', label: 'Hisat2', x: 705, y: 363 }
      ],
      edges: [['io', 'n1'], ['ref', 'n2'], ['n1', 'n3'], ['n2', 'n3']]
    };
  }

  function icon(name, pos, on) {
    var paths = {
      undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
      nodes: '<circle cx="12" cy="7" r="2.6"/><circle cx="6" cy="17" r="2.6"/><circle cx="18" cy="17" r="2.6"/><path d="M12 9.6 7 14.6M12 9.6l5 5"/>',
      tool: '<path d="M14.7 6.3a4 4 0 0 0 5 5L21 12.6 12.6 21a2.1 2.1 0 0 1-3-3L18 9.6"/><path d="M14.7 6.3 11 10"/>',
      down: '<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>',
      folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 16v-5M9.5 13.5 12 11l2.5 2.5"/>',
      zin: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5M11 8v6M8 11h6"/>',
      zout: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5M8 11h6"/>',
      box: '<rect x="5" y="5" width="14" height="14" rx="2"/>'
    };
    return '<svg class="pf-ic' + (on ? ' pf-on' : '') + '" style="' + pos + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths[name] + '</svg>';
  }

  var RAIL = icon('undo', 'top:7px') + icon('nodes', 'top:51px', true) + icon('tool', 'top:94px') + icon('down', 'top:137px') + icon('folder', 'top:180px') +
    icon('zin', 'bottom:82px') + icon('zout', 'bottom:48px') + icon('box', 'bottom:14px');

  var MODAL = '<div class="pf-modal" role="dialog" aria-label="Pipeline submitted"><div class="pf-card">' +
    '<h5>Pipeline submitted successfully</h5>' +
    '<svg class="pf-art" viewBox="0 0 160 100" aria-hidden="true"><path d="M38 34 100 14l22 44-62 20z" fill="#f2d36b"/><path d="M60 40l36-10" stroke="#b9902a" stroke-width="1.5" stroke-dasharray="4 3" fill="none"/><path d="M20 80c8-18 20-32 40-40l6 12c-12 6-18 16-24 30z" fill="#f3c9a0" stroke="#8a5a3a" stroke-width="1.5"/><path d="M142 76c-6-16-14-28-34-34l-6 12c10 4 14 14 20 26z" fill="#f3c9a0" stroke="#8a5a3a" stroke-width="1.5"/><circle cx="112" cy="34" r="9" fill="none" stroke="#8a5a3a" stroke-width="1.5"/></svg>' +
    '<b>Stitching in progress.</b><p>Meanwhile, Go to dashboard to track the progress</p>' +
    '<button type="button" class="pf-go" data-act="close">Go to Dashboard</button></div></div>';

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function ProductDemo(container) {
    var logo = container.getAttribute('data-logo') || 'genxflo-logo.svg';
    var state = initial();
    var seq = 10;
    var scale = 1;

    container.classList.add('pf-host');
    container.innerHTML =
      '<div class="pf-sizer"><div class="pf-stage">' +
      '<div class="pf-top"><img class="pf-logo" src="' + logo + '" alt="GenXflo"><span class="pf-back"><i class="ph-bold ph-squares-four"></i>Back to Dashboard</span>' +
      '<span class="pf-top-links"><span>Home</span><span>Documentation</span><span class="pf-avatar">S</span></span></div>' +
      '<div class="pf-rail">' + RAIL + '</div>' +
      '<div class="pf-list"></div>' +
      '<div class="pf-canvas"><svg class="pf-edges" width="' + (W - 227) + '" height="' + (H - 64) + '"><defs><marker id="pf-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="#aeb3d1"/></marker></defs></svg>' +
      '<div class="pf-nodes"></div><div class="pf-tray"><button type="button" class="pf-btn" data-act="reset">Reset</button><button type="button" class="pf-btn" data-act="validate">Validate</button></div><div class="pf-toast" role="status"></div></div>' +
      MODAL +
      '</div></div>';

    var sizer = container.querySelector('.pf-sizer');
    var stage = container.querySelector('.pf-stage');
    var list = container.querySelector('.pf-list');
    var canvas = container.querySelector('.pf-canvas');
    var svg = container.querySelector('.pf-edges');
    var layer = container.querySelector('.pf-nodes');
    var toast = container.querySelector('.pf-toast');
    var modal = container.querySelector('.pf-modal');
    var ghost = null;
    var toastTimer = 0;

    TOOLS.forEach(function (name) {
      var item = el('div', 'pf-tool', name);
      item.setAttribute('data-tool', name);
      list.appendChild(item);
    });
    list.scrollTop = 119;

    function fit() {
      var width = container.clientWidth;
      scale = Math.min(1, width / W);
      stage.style.transform = 'scale(' + scale + ')';
      sizer.style.width = W * scale + 'px';
      sizer.style.height = H * scale + 'px';
    }

    function find(id) {
      for (var i = 0; i < state.nodes.length; i++) if (state.nodes[i].id === id) return state.nodes[i];
      return null;
    }

    function size(n) {
      return n.type === 'proc' ? { w: PROC_W, h: PROC_H } : { w: n.w, h: n.h };
    }

    function outPoint(n) { var s = size(n); return { x: n.x + s.w, y: n.y + s.h / 2 }; }
    function inPoint(n) { var s = size(n); return { x: n.x, y: n.y + s.h / 2 }; }

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
        var d = pathFor(outPoint(from), inPoint(to));
        var line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('class', 'pf-edge');
        line.setAttribute('d', d);
        line.setAttribute('marker-end', 'url(#pf-arrow)');
        var hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hit.setAttribute('class', 'pf-hit');
        hit.setAttribute('d', d);
        hit.addEventListener('click', function () { state.edges.splice(index, 1); drawEdges(); });
        svg.appendChild(line);
        svg.appendChild(hit);
      });
    }

    function nodeHtml(n) {
      if (n.type === 'io') {
        return '<h4>Inputs and Outputs</h4><p>Inputs:<br>/home/sat_msi/data/input/files/*_{R1,R2}.fastq.gz</p><p>Outputs: /home/sat_msi/data/output/</p><span class="pf-edit">Edit</span><i class="pf-port pf-out" data-id="' + n.id + '"></i>';
      }
      if (n.type === 'ref') {
        return '<h4>References</h4><p>1. /home/data/output/ref.fa</p><span class="pf-edit">Edit</span><i class="pf-port pf-out" data-id="' + n.id + '"></i>';
      }
      return '<div class="pf-select"><span>' + n.label + '</span><i class="ph-bold ph-caret-down"></i></div><i class="pf-port pf-in" data-id="' + n.id + '"></i><i class="pf-port pf-out" data-id="' + n.id + '"></i><button type="button" class="pf-del" aria-label="Remove ' + n.label + '">&times;</button>';
    }

    function renderNodes() {
      layer.innerHTML = '';
      state.nodes.forEach(function (n) {
        var node = el('div', 'pf-node pf-' + n.type, nodeHtml(n));
        node.setAttribute('data-id', n.id);
        node.style.left = n.x + 'px';
        node.style.top = n.y + 'px';
        if (n.type !== 'proc') { node.style.width = n.w + 'px'; node.style.height = n.h + 'px'; }
        layer.appendChild(node);
      });
      drawEdges();
    }

    function notify(text, ok) {
      toast.textContent = text;
      toast.className = 'pf-toast pf-show' + (ok ? ' pf-ok' : '');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.className = 'pf-toast'; }, 2200);
    }

    function validate() {
      var procs = state.nodes.filter(function (n) { return n.type === 'proc'; });
      var loose = procs.filter(function (n) {
        return !state.edges.some(function (e) { return e[1] === n.id; });
      });
      if (!procs.length) return notify('Add at least one tool to the canvas', false);
      if (loose.length) return notify(loose.length + (loose.length === 1 ? ' tool has' : ' tools have') + ' no input connected', false);
      modal.classList.add('pf-open');
    }

    function reset() {
      state = initial();
      renderNodes();
      notify('Canvas reset', true);
    }

    function toLocal(event) {
      var rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
    }

    // ---- drag a tool from the list onto the canvas
    function onToolDown(event) {
      var tool = event.target.closest('.pf-tool');
      if (!tool || event.button > 0) return;
      event.preventDefault();
      var name = tool.getAttribute('data-tool');
      ghost = el('div', 'pf-ghost', name);
      document.body.appendChild(ghost);
      moveGhost(event);
      tool.classList.add('pf-active');
      function move(e) { moveGhost(e); }
      function up(e) {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        tool.classList.remove('pf-active');
        if (ghost) { ghost.remove(); ghost = null; }
        var rect = canvas.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          var p = toLocal(e);
          state.nodes.push({
            id: 'n' + (++seq), type: 'proc', label: name,
            x: Math.max(8, Math.min(W - 227 - PROC_W - 8, p.x - PROC_W / 2)),
            y: Math.max(8, Math.min(H - 64 - PROC_H - 8, p.y - PROC_H / 2))
          });
          renderNodes();
          var added = layer.querySelector('[data-id="n' + seq + '"]');
          if (added) { added.classList.add('pf-new'); setTimeout(function () { added.classList.remove('pf-new'); }, 2600); }
        }
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }

    function moveGhost(e) {
      if (ghost) ghost.style.transform = 'translate(' + (e.clientX - 12) + 'px,' + (e.clientY - 16) + 'px)';
    }

    // ---- move nodes / draw connections
    function onCanvasDown(event) {
      if (event.button > 0) return;
      var del = event.target.closest('.pf-del');
      if (del) {
        var gone = del.closest('.pf-node').getAttribute('data-id');
        state.nodes = state.nodes.filter(function (n) { return n.id !== gone; });
        state.edges = state.edges.filter(function (e) { return e[0] !== gone && e[1] !== gone; });
        renderNodes();
        return;
      }
      var port = event.target.closest('.pf-out');
      var nodeEl = event.target.closest('.pf-node');
      if (port) { startConnect(event, port.getAttribute('data-id')); return; }
      if (nodeEl && !event.target.closest('.pf-edit')) startMove(event, nodeEl);
    }

    function startMove(event, nodeEl) {
      var n = find(nodeEl.getAttribute('data-id'));
      var start = toLocal(event);
      var ox = n.x;
      var oy = n.y;
      var s = size(n);
      nodeEl.classList.add('pf-lift');
      function move(e) {
        var p = toLocal(e);
        n.x = Math.max(0, Math.min(W - 227 - s.w, ox + p.x - start.x));
        n.y = Math.max(0, Math.min(H - 64 - s.h, oy + p.y - start.y));
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
      var from = find(fromId);
      var a = outPoint(from);
      var temp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      temp.setAttribute('class', 'pf-edge pf-temp');
      svg.appendChild(temp);
      function move(e) { temp.setAttribute('d', pathFor(a, toLocal(e))); }
      function up(e) {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        temp.remove();
        var hit = document.elementFromPoint(e.clientX, e.clientY);
        var target = hit && hit.closest('.pf-node.pf-proc');
        if (!target) return;
        var toId = target.getAttribute('data-id');
        if (toId === fromId) return;
        var dup = state.edges.some(function (edge) { return edge[0] === fromId && edge[1] === toId; });
        if (!dup) { state.edges.push([fromId, toId]); drawEdges(); }
      }
      move(event);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }

    function onClick(event) {
      var btn = event.target.closest('.pf-btn');
      if (!btn) return;
      if (btn.getAttribute('data-act') === 'close') modal.classList.remove('pf-open');
      else if (btn.getAttribute('data-act') === 'reset') reset();
      else validate();
    }

    list.addEventListener('pointerdown', onToolDown);
    canvas.addEventListener('pointerdown', onCanvasDown);
    container.addEventListener('click', onClick);
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.remove('pf-open'); });
    var ro = new ResizeObserver(fit);
    ro.observe(container);
    fit();
    renderNodes();

    return {
      reset: reset,
      destroy: function () {
        ro.disconnect();
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
