/*
 * DashboardDemo — an interactive replica of the GenXflo workflow builder.
 * Drag a tool from the list onto the canvas, move nodes, and connect them by
 * dragging from an output port to an input port. Click a line to remove it.
 *   const d = DashboardDemo(containerElement);  d.reset();  d.destroy();
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
    return '<svg class="dd-ic' + (on ? ' dd-on' : '') + '" style="' + pos + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths[name] + '</svg>';
  }

  var RAIL = icon('undo', 'top:7px') + icon('nodes', 'top:51px', true) + icon('tool', 'top:94px') + icon('down', 'top:137px') + icon('folder', 'top:180px') +
    icon('zin', 'bottom:82px') + icon('zout', 'bottom:48px') + icon('box', 'bottom:14px');

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function DashboardDemo(container) {
    var logo = container.getAttribute('data-logo') || '../genxflo-logo.svg';
    var state = initial();
    var seq = 10;
    var scale = 1;

    container.classList.add('dd-host');
    container.innerHTML =
      '<div class="dd-sizer"><div class="dd-stage">' +
      '<div class="dd-top"><img class="dd-logo" src="' + logo + '" alt="GenXflo"><span class="dd-back"><i class="ph-bold ph-squares-four"></i>Back to Dashboard</span>' +
      '<span class="dd-top-links"><span>Home</span><span>Documentation</span><span class="dd-avatar">S</span></span></div>' +
      '<div class="dd-rail">' + RAIL + '</div>' +
      '<div class="dd-list"></div>' +
      '<div class="dd-canvas"><svg class="dd-edges" width="' + (W - 227) + '" height="' + (H - 64) + '"><defs><marker id="dd-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="#aeb3d1"/></marker></defs></svg>' +
      '<div class="dd-nodes"></div><div class="dd-tray"><button type="button" class="dd-btn" data-act="reset">Reset</button><button type="button" class="dd-btn" data-act="validate">Validate</button></div><div class="dd-toast" role="status"></div></div>' +
      '</div></div>';

    var sizer = container.querySelector('.dd-sizer');
    var stage = container.querySelector('.dd-stage');
    var list = container.querySelector('.dd-list');
    var canvas = container.querySelector('.dd-canvas');
    var svg = container.querySelector('.dd-edges');
    var layer = container.querySelector('.dd-nodes');
    var toast = container.querySelector('.dd-toast');
    var ghost = null;
    var toastTimer = 0;

    TOOLS.forEach(function (name) {
      var item = el('div', 'dd-tool', name);
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
      svg.querySelectorAll('.dd-edge, .dd-hit').forEach(function (p) { p.remove(); });
      state.edges.forEach(function (edge, index) {
        var from = find(edge[0]);
        var to = find(edge[1]);
        if (!from || !to) return;
        var d = pathFor(outPoint(from), inPoint(to));
        var line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('class', 'dd-edge');
        line.setAttribute('d', d);
        line.setAttribute('marker-end', 'url(#dd-arrow)');
        var hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hit.setAttribute('class', 'dd-hit');
        hit.setAttribute('d', d);
        hit.addEventListener('click', function () { state.edges.splice(index, 1); drawEdges(); });
        svg.appendChild(line);
        svg.appendChild(hit);
      });
    }

    function nodeHtml(n) {
      if (n.type === 'io') {
        return '<h4>Inputs and Outputs</h4><p>Inputs:<br>/home/sat_msi/data/input/files/*_{R1,R2}.fastq.gz</p><p>Outputs: /home/sat_msi/data/output/</p><span class="dd-edit">Edit</span><i class="dd-port dd-out" data-id="' + n.id + '"></i>';
      }
      if (n.type === 'ref') {
        return '<h4>References</h4><p>1. /home/data/output/ref.fa</p><span class="dd-edit">Edit</span><i class="dd-port dd-out" data-id="' + n.id + '"></i>';
      }
      return '<div class="dd-select"><span>' + n.label + '</span><i class="ph-bold ph-caret-down"></i></div><i class="dd-port dd-in" data-id="' + n.id + '"></i><i class="dd-port dd-out" data-id="' + n.id + '"></i><button type="button" class="dd-del" aria-label="Remove ' + n.label + '">&times;</button>';
    }

    function renderNodes() {
      layer.innerHTML = '';
      state.nodes.forEach(function (n) {
        var node = el('div', 'dd-node dd-' + n.type, nodeHtml(n));
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
      toast.className = 'dd-toast dd-show' + (ok ? ' dd-ok' : '');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.className = 'dd-toast'; }, 2200);
    }

    function validate() {
      var procs = state.nodes.filter(function (n) { return n.type === 'proc'; });
      var loose = procs.filter(function (n) {
        return !state.edges.some(function (e) { return e[1] === n.id; });
      });
      if (!procs.length) return notify('Add at least one tool to the canvas', false);
      if (loose.length) return notify(loose.length + (loose.length === 1 ? ' tool has' : ' tools have') + ' no input connected', false);
      notify('Valid pipeline', true);
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
      var tool = event.target.closest('.dd-tool');
      if (!tool || event.button > 0) return;
      event.preventDefault();
      var name = tool.getAttribute('data-tool');
      ghost = el('div', 'dd-ghost', name);
      document.body.appendChild(ghost);
      moveGhost(event);
      tool.classList.add('dd-active');
      function move(e) { moveGhost(e); }
      function up(e) {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        tool.classList.remove('dd-active');
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
      var del = event.target.closest('.dd-del');
      if (del) {
        var gone = del.closest('.dd-node').getAttribute('data-id');
        state.nodes = state.nodes.filter(function (n) { return n.id !== gone; });
        state.edges = state.edges.filter(function (e) { return e[0] !== gone && e[1] !== gone; });
        renderNodes();
        return;
      }
      var port = event.target.closest('.dd-out');
      var nodeEl = event.target.closest('.dd-node');
      if (port) { startConnect(event, port.getAttribute('data-id')); return; }
      if (nodeEl && !event.target.closest('.dd-edit')) startMove(event, nodeEl);
    }

    function startMove(event, nodeEl) {
      var n = find(nodeEl.getAttribute('data-id'));
      var start = toLocal(event);
      var ox = n.x;
      var oy = n.y;
      var s = size(n);
      nodeEl.classList.add('dd-lift');
      function move(e) {
        var p = toLocal(e);
        n.x = Math.max(0, Math.min(W - 227 - s.w, ox + p.x - start.x));
        n.y = Math.max(0, Math.min(H - 64 - s.h, oy + p.y - start.y));
        nodeEl.style.left = n.x + 'px';
        nodeEl.style.top = n.y + 'px';
        drawEdges();
      }
      function up() {
        nodeEl.classList.remove('dd-lift');
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
      temp.setAttribute('class', 'dd-edge dd-temp');
      svg.appendChild(temp);
      function move(e) { temp.setAttribute('d', pathFor(a, toLocal(e))); }
      function up(e) {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        temp.remove();
        var hit = document.elementFromPoint(e.clientX, e.clientY);
        var target = hit && hit.closest('.dd-node.dd-proc');
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
      var btn = event.target.closest('.dd-btn');
      if (!btn) return;
      if (btn.getAttribute('data-act') === 'reset') reset();
      else validate();
    }

    list.addEventListener('pointerdown', onToolDown);
    canvas.addEventListener('pointerdown', onCanvasDown);
    canvas.addEventListener('click', onClick);
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
        container.classList.remove('dd-host');
      }
    };
  }

  window.DashboardDemo = DashboardDemo;
})();
