/*
 * GlobeHero — a dotted, glass-like night globe drawn on a 2D canvas.
 *   const g = GlobeHero(canvasElement, { lat: 8, lon: -38 });  g.destroy();
 * Needs globe-land.js (window.GLOBE_LAND, a 1-degree land mask) loaded first.
 * The canvas must be a square; the globe fills it with a small margin for the glow.
 */
(function () {
  'use strict';

  var DEG = Math.PI / 180;

  function decodeMask(src) {
    var bin = atob(src.data);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { w: src.w, h: src.h, bytes: bytes };
  }

  function isLand(mask, lat, lon) {
    var col = Math.floor(((lon + 540) % 360));
    var row = Math.floor(90 - lat);
    if (row < 0) row = 0;
    if (row > mask.h - 1) row = mask.h - 1;
    var i = row * mask.w + col;
    return (mask.bytes[i >> 3] >> (i & 7)) & 1;
  }

  function GlobeHero(canvas, options) {
    var o = Object.assign({
      lat: 8,
      lon: -38,
      sway: 0,
      swaySpeed: 0.22,
      radius: 0.92,       // globe radius as a fraction of half the canvas
      spacing: 0.0038,    // dot spacing as a fraction of the canvas width
      markers: [
        { x: -0.153, y: 0.4 },
        { x: 0.306, y: 0.176 },
        { x: 0.053, y: -0.259 }
      ],
      arcs: [
        { from: 0, to: { x: -0.33, y: 0.78 }, bend: 0.1 },
        { from: 1, to: { x: 0.74, y: 0.62 }, bend: -0.16 },
        { from: 2, to: { x: -0.64, y: -0.12 }, bend: 0.12 }
      ]
    }, options || {});

    var ctx = canvas.getContext('2d');
    var mask = window.GLOBE_LAND ? decodeMask(window.GLOBE_LAND) : null;
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var size = 0, ratio = 1, raf = 0, visible = true, start = performance.now(), last = 0;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      size = Math.max(2, Math.round(rect.width * ratio));
      canvas.width = size;
      canvas.height = size;
      draw(performance.now());
    }

    var base = document.createElement('canvas');
    var baseKey = '';

    function drawBase(lonDeg) {
      base.width = size; base.height = size;
      var bctx = base.getContext('2d');
      var saved = ctx; ctx = bctx;
      paintGlobe(lonDeg);
      ctx = saved;
    }

    function paintGlobe(lonDeg) {
      var lat0 = o.lat * DEG;
      var lon0 = lonDeg * DEG;
      var sinP = Math.sin(lat0), cosP = Math.cos(lat0);
      var cx = size / 2, cy = size / 2;
      var R = (size / 2) * o.radius;
      ctx.clearRect(0, 0, size, size);

      // soft outer glow
      var glow = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.1);
      glow.addColorStop(0, 'rgba(170,255,100,.34)');
      glow.addColorStop(1, 'rgba(170,255,100,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.1, 0, Math.PI * 2); ctx.fill();

      // sphere body
      var body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.05, cx, cy, R);
      body.addColorStop(0, '#16421d');
      body.addColorStop(0.55, '#0a2411');
      body.addColorStop(1, '#030d06');
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      // dotted surface
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
      var step = Math.max(2, size * o.spacing);
      var lx = -0.5, ly = 0.6, lz = 0.62;
      var ll = Math.sqrt(lx * lx + ly * ly + lz * lz); lx /= ll; ly /= ll; lz /= ll;
      var row = 0;
      for (var py = cy - R; py <= cy + R; py += step * 0.866, row++) {
        var offset = (row & 1) ? step / 2 : 0;
        for (var px = cx - R + offset; px <= cx + R; px += step) {
          var x = (px - cx) / R, y = -(py - cy) / R;
          var rho2 = x * x + y * y;
          if (rho2 >= 0.998) continue;
          var z = Math.sqrt(1 - rho2);
          var rho = Math.sqrt(rho2);
          var c = Math.asin(rho);
          var lat, lon;
          if (rho < 1e-6) { lat = lat0; lon = lon0; }
          else {
            lat = Math.asin(Math.cos(c) * sinP + (y * Math.sin(c) * cosP) / rho);
            lon = lon0 + Math.atan2(x * Math.sin(c), rho * cosP * Math.cos(c) - y * sinP * Math.sin(c));
          }
          var land = mask ? isLand(mask, lat / DEG, lon / DEG) : 0;
          var light = Math.max(0, x * lx + y * ly + z * lz);
          var edge = Math.pow(1 - z, 2.2);
          if (land) {
            var g = 70 + 150 * light + 60 * edge;
            var r = 30 + 80 * light + 50 * edge;
            ctx.fillStyle = 'rgba(' + (r | 0) + ',' + Math.min(255, g | 0) + ',' + (45 + 40 * light | 0) + ',' + (0.55 + 0.45 * Math.min(1, light + edge)) + ')';
            var s = step * (0.5 + 0.22 * light);
            ctx.fillRect(px - s / 2, py - s / 2, s, s);
          } else {
            ctx.fillStyle = 'rgba(60,150,70,' + (0.05 + 0.1 * light + 0.12 * edge) + ')';
            var s2 = step * 0.2;
            ctx.fillRect(px - s2 / 2, py - s2 / 2, s2, s2);
          }
        }
      }
      ctx.restore();

      // glassy rim: fresnel edge, brighter on the lit side
      var rim = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R);
      rim.addColorStop(0, 'rgba(160,255,110,0)');
      rim.addColorStop(0.8, 'rgba(160,255,110,.1)');
      rim.addColorStop(1, 'rgba(210,255,160,.55)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      var edgeLine = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
      edgeLine.addColorStop(0, 'rgba(235,255,200,.95)');
      edgeLine.addColorStop(0.5, 'rgba(170,255,110,.35)');
      edgeLine.addColorStop(1, 'rgba(120,230,80,.18)');
      ctx.strokeStyle = edgeLine;
      ctx.lineWidth = Math.max(1, size * 0.004);
      ctx.beginPath(); ctx.arc(cx, cy, R - ctx.lineWidth / 2, 0, Math.PI * 2); ctx.stroke();

      // gloss
      var gloss = ctx.createRadialGradient(cx - R * 0.5, cy - R * 0.6, 0, cx - R * 0.5, cy - R * 0.6, R * 0.7);
      gloss.addColorStop(0, 'rgba(220,255,190,.22)');
      gloss.addColorStop(1, 'rgba(220,255,190,0)');
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = gloss;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();

    }

    function draw(now) {
      var t = (now - start) / 1000;
      var lonDeg = o.lon + (reduce ? 0 : o.sway * Math.sin(t * o.swaySpeed));
      var key = size + ':' + Math.round(lonDeg * 4);
      if (key !== baseKey) { baseKey = key; drawBase(lonDeg); }
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(base, 0, 0);
      var cx = size / 2, cy = size / 2, R = (size / 2) * o.radius;

      // arcs
      var line = Math.max(1, size * 0.0018);
      ctx.lineWidth = line;
      ctx.strokeStyle = 'rgba(255,255,255,.78)';
      o.arcs.forEach(function (arc) {
        var m = o.markers[arc.from];
        var ax = cx + m.x * R, ay = cy - m.y * R;
        var bx = cx + arc.to.x * R, by = cy - arc.to.y * R;
        var mx = (ax + bx) / 2, my = (ay + by) / 2;
        var dx = bx - ax, dy = by - ay;
        var qx = mx - dy * arc.bend * 2, qy = my + dx * arc.bend * 2;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(qx, qy, bx, by); ctx.stroke();
      });

      // markers
      o.markers.forEach(function (m, i) {
        var mx = cx + m.x * R, my = cy - m.y * R;
        var pulse = reduce ? 0 : (Math.sin(t * 2 + i * 1.7) + 1) / 2;
        var r = size * 0.0125;
        var halo = ctx.createRadialGradient(mx, my, 0, mx, my, r * (3 + pulse * 1.2));
        halo.addColorStop(0, 'rgba(200,255,90,.55)');
        halo.addColorStop(1, 'rgba(200,255,90,0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(mx, my, r * (3 + pulse * 1.2), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(8,24,10,.75)';
        ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.95)';
        ctx.lineWidth = line * 1.2;
        ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#c9ff4d';
        ctx.beginPath(); ctx.arc(mx, my, r * 0.42, 0, Math.PI * 2); ctx.fill();
      });
    }

    function frame(now) {
      raf = 0;
      if (!visible) return;
      if (now - last > 33) { last = now; draw(now); }
      if (!reduce) raf = requestAnimationFrame(frame);
    }

    var ro = new ResizeObserver(resize);
    ro.observe(canvas);
    var io = new IntersectionObserver(function (entries) {
      visible = entries.some(function (e) { return e.isIntersecting; });
      if (visible && !raf && !reduce) raf = requestAnimationFrame(frame);
    });
    io.observe(canvas);
    resize();
    if (!reduce) raf = requestAnimationFrame(frame);

    return {
      destroy: function () { ro.disconnect(); io.disconnect(); cancelAnimationFrame(raf); }
    };
  }

  window.GlobeHero = GlobeHero;
})();
