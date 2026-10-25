/*
 * CircularCarousel — vanilla JS port of the React "cylinder" carousel.
 *   window.CircularCarousel(rootElement, options)
 * Every direct child of the root becomes a card on a 3D ring. The ring drifts, can be dragged (with
 * momentum and snapping), pauses on hover, follows the pointer a little, and clicking a card brings it to the front.
 * options: cardWidth, cardHeight, gap, tilt, perspective, speed, momentum, snap, pauseOnHover, focusOnClick,
 *          draggable, parallax, stretch, depthFade, fadeColor, innerShade, cornerRadius, direction, intro
 */
(function () {
  'use strict';

  var TO_RAD = Math.PI / 180;
  var SPRING = 118, SETTLE_SPEED = 9, DRAG_THRESHOLD = 5, INTRO_MS = 1400;

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function wrap(d) { return ((((d + 180) % 360) + 360) % 360) - 180; }
  function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); }
  function rotX(p, deg) { var r = deg * TO_RAD, c = Math.cos(r), s = Math.sin(r); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
  function rotY(p, deg) { var r = deg * TO_RAD, c = Math.cos(r), s = Math.sin(r); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }

  function CircularCarousel(root, options) {
    var o = Object.assign({
      cardWidth: 340, cardHeight: 230, gap: 25, tilt: -5, perspective: 2500, speed: 14, momentum: 0.6,
      snap: true, pauseOnHover: true, focusOnClick: true, draggable: true, parallax: 0.3, stretch: 0.5,
      depthFade: 0.55, fadeColor: '#eef4f0', innerShade: 0.6, cornerRadius: 8, direction: 'left', intro: 'rise'
    }, options || {});

    var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var cards = [].slice.call(root.children);
    var count = cards.length;
    if (count < 3) return { destroy: function () {} };
    var step = 360 / count;
    var cardW = o.cardWidth, cardH = o.cardHeight;
    var pitch = cardW + o.gap;
    var radius = Math.max(pitch / (2 * Math.sin(Math.PI / count)), cardW * 0.6);

    // ---- build the 3D scene --------------------------------------------------------------
    root.classList.add('cc-3d');
    root.style.setProperty('--cc-fade', o.fadeColor);
    root.style.setProperty('--cc-radius', o.cornerRadius + 'px');
    root.style.setProperty('--cc-inner', (1 - clamp(o.innerShade, 0, 1)).toFixed(3));
    root.setAttribute('role', 'region');
    root.setAttribute('aria-roledescription', 'carousel');
    root.tabIndex = 0;

    var stage = document.createElement('div'); stage.className = 'cc-stage';
    var camera = document.createElement('div'); camera.className = 'cc-camera';
    var ring = document.createElement('div'); ring.className = 'cc-ring';
    stage.appendChild(camera); camera.appendChild(ring);

    var holders = cards.map(function (card, i) {
      var holder = document.createElement('div');
      holder.className = 'cc-card';
      holder.setAttribute('data-cc-index', i);
      holder.style.width = cardW + 'px';
      holder.style.height = cardH + 'px';
      holder.style.left = -cardW / 2 + 'px';
      holder.style.top = -cardH / 2 + 'px';
      var front = document.createElement('div'); front.className = 'cc-face cc-front';
      front.appendChild(card);
      var shade = document.createElement('div'); shade.className = 'cc-shade';
      front.appendChild(shade);
      var back = document.createElement('div'); back.className = 'cc-face cc-back';
      var echo = card.cloneNode(true); echo.setAttribute('aria-hidden', 'true'); echo.removeAttribute('id'); back.appendChild(echo);
      holder.appendChild(front); holder.appendChild(back);
      ring.appendChild(holder);
      return holder;
    });
    root.appendChild(stage);

    // ---- state -----------------------------------------------------------------------------
    var st = {
      angle: 0, velocity: 0, target: null, dir: (o.direction === 'right' ? 1 : -1), press: null, drag: false, hover: false,
      pointer: { inside: false, x: 0, y: 0 }, yaw: 0, pitch: 0, intro: null, introDone: false, holdUntil: 0,
      suppressClick: false, fit: 1, shift: 0, drop: 0, last: 0, wheelTimer: 0
    };
    var raf = 0, visible = true;
    var perspective = o.perspective;

    function nearest(a) { return Math.round(a / step) * step; }

    function measure() {
      var rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var width = rect.width * (o.fitWidth || 0.96), height = rect.height * 0.94;
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      var corners = [[-cardW / 2, -cardH / 2], [cardW / 2, -cardH / 2], [-cardW / 2, cardH / 2], [cardW / 2, cardH / 2]];
      for (var a = -180; a <= 180; a += 15) {
        for (var c = 0; c < 4; c++) {
          var p = rotX(rotY([corners[c][0], corners[c][1], radius], a), o.tilt);
          p = [p[0], p[1], p[2] - radius];
          if (p[2] >= perspective * 0.95) continue;
          var k = perspective / (perspective - p[2]);
          minX = Math.min(minX, p[0] * k); maxX = Math.max(maxX, p[0] * k);
          minY = Math.min(minY, p[1] * k); maxY = Math.max(maxY, p[1] * k);
        }
      }
      var fit = Math.min(1, width / Math.max(maxX - minX, 1), height / Math.max(maxY - minY, 1));
      st.fit = fit;
      st.shift = -((minY + maxY) / 2) * fit;
      st.drop = (rect.height / fit) * 0.55 + cardH;
      stage.style.perspective = perspective + 'px';
      stage.style.transform = 'translate3d(0,' + st.shift + 'px,0) scale(' + fit + ')';
    }

    function advance(dt, now) {
      if (!st.introDone) {
        if (!st.intro) {
          if (reduced || o.intro === 'none') st.introDone = true;
          else st.intro = { start: now };
        }
        if (st.intro && now - st.intro.start >= INTRO_MS) { st.intro = null; st.introDone = true; }
      }
      var paused = (o.pauseOnHover && st.hover) || st.drag || now < st.holdUntil;
      var cruise = !reduced && !paused && !st.intro ? o.speed * st.dir : 0;
      var busy = !!st.intro || st.drag;

      if (st.drag || st.intro) {
        st.velocity = st.drag ? st.velocity : 0;
      } else if (st.target !== null) {
        var remaining = dt, damping = 2 * Math.sqrt(SPRING);
        while (remaining > 0) {
          var h = Math.min(remaining, 1 / 240);
          st.velocity += (SPRING * (st.target - st.angle) - damping * st.velocity) * h;
          st.angle += st.velocity * h;
          remaining -= h;
        }
        if (Math.abs(st.target - st.angle) < 0.004 && Math.abs(st.velocity) < 0.03) { st.angle = st.target; st.velocity = 0; st.target = null; }
        busy = true;
      } else {
        var tau = 0.18 + o.momentum * 1.5;
        st.velocity += (cruise - st.velocity) * (1 - Math.exp(-dt / tau));
        st.angle += st.velocity * dt;
        if (cruise === 0 && o.snap && Math.abs(st.velocity) < SETTLE_SPEED) st.target = nearest(st.angle);
        busy = busy || cruise !== 0 || Math.abs(st.velocity) > 0.01 || st.target !== null;
      }
      if (now < st.holdUntil) busy = true;

      var ease = 1 - Math.exp(-dt / 0.35);
      var par = reduced ? 0 : o.parallax;
      var aimYaw = st.pointer.inside ? st.pointer.x * par * 9 : 0;
      var aimPitch = st.pointer.inside ? -st.pointer.y * par * 6 : 0;
      st.yaw += (aimYaw - st.yaw) * ease;
      st.pitch += (aimPitch - st.pitch) * ease;
      if (Math.abs(aimYaw - st.yaw) > 0.01 || Math.abs(aimPitch - st.pitch) > 0.01) busy = true;
      return busy;
    }

    function render(now) {
      var elapsed = st.intro ? now - st.intro.start : 0;
      var swell = 1 + (reduced ? 0 : o.stretch) * 0.12 * Math.min(1, Math.abs(st.velocity) / 420);
      var R = radius * swell;
      camera.style.transform = 'translate3d(0,0,' + -R + 'px) rotateX(' + (o.tilt + st.pitch) + 'deg) rotateY(' + st.yaw + 'deg)';
      ring.style.transform = 'rotateY(' + st.angle + 'deg)';
      for (var i = 0; i < count; i++) {
        var base = i * step;
        var transform = 'rotateY(' + base + 'deg) translateZ(' + R + 'px)';
        if (st.intro) {
          var reach = Math.abs(wrap(base + st.angle));
          var p = easeOutQuint(clamp((elapsed - (reach / 180) * 480) / 900, 0, 1));
          transform += ' translateY(' + (1 - p) * st.drop + 'px)';
        }
        holders[i].style.transform = transform;
        var facing = Math.cos(wrap(base + st.angle) * TO_RAD);
        holders[i].style.setProperty('--cc-depth', (o.depthFade * Math.pow((1 - facing) / 2, 1.25)).toFixed(3));
      }
    }

    function frame(now) {
      raf = 0;
      var dt = st.last ? Math.min((now - st.last) / 1000, 0.05) : 1 / 60;
      st.last = now;
      var busy = advance(dt, now);
      render(now);
      if (busy && visible && !document.hidden) raf = requestAnimationFrame(frame);
      else st.last = 0;
    }
    function wake() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }

    function focusIndex(i) {
      var target = -i * step;
      target += 360 * Math.round((st.angle - target) / 360);
      st.target = target;
      st.holdUntil = performance.now() + 2800;
      wake();
    }
    function stepBy(d) {
      var base = st.target !== null ? st.target : nearest(st.angle);
      st.target = base - d * step;
      st.holdUntil = performance.now() + 2800;
      wake();
    }

    // ---- input -----------------------------------------------------------------------------
    function updatePointer(e) {
      var r = root.getBoundingClientRect();
      st.pointer.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      st.pointer.y = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    }
    function onDown(e) {
      st.suppressClick = false;
      if (!o.draggable || e.button !== 0) return;
      st.press = { id: e.pointerId, x: e.clientX, y: e.clientY, angle: st.angle, moved: false, origin: 0, samples: [{ time: performance.now(), angle: st.angle }] };
    }
    function onMove(e) {
      if (e.pointerType === 'mouse') { st.pointer.inside = true; updatePointer(e); }
      var press = st.press;
      if (!press || press.id !== e.pointerId) { wake(); return; }
      var dx = e.clientX - press.x, dy = e.clientY - press.y;
      if (!press.moved) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        if (Math.abs(dy) > Math.abs(dx) * 1.2 && e.pointerType !== 'mouse') { st.press = null; return; }
        press.moved = true; press.origin = dx; st.drag = true; st.target = null; st.velocity = 0;
        root.classList.add('is-dragging');
        try { root.setPointerCapture(e.pointerId); } catch (err) {}
      }
      var perPixel = 180 / (Math.PI * radius * st.fit);
      st.angle = press.angle + (dx - press.origin) * perPixel;
      var now = performance.now();
      press.samples.push({ time: now, angle: st.angle });
      while (press.samples.length > 2 && now - press.samples[0].time > 110) press.samples.shift();
      wake();
    }
    function onUp(e) {
      var press = st.press;
      if (!press || press.id !== e.pointerId) return;
      st.press = null;
      if (!press.moved) return;
      st.drag = false; root.classList.remove('is-dragging'); st.suppressClick = true;
      var first = press.samples[0], last = press.samples[press.samples.length - 1];
      var span = (last.time - first.time) / 1000;
      var v = span > 0.008 ? clamp((last.angle - first.angle) / span, -1400, 1400) : 0;
      st.velocity = v;
      if (Math.abs(v) > 60) st.dir = Math.sign(v);
      var coasting = !(o.pauseOnHover && st.hover && e.pointerType === 'mouse');
      if (o.snap && !coasting) st.target = Math.round((st.angle + v * (0.18 + o.momentum * 1.5) * 0.55) / step) * step;
      wake();
    }
    function onEnter(e) { if (e.pointerType === 'mouse') { st.hover = true; wake(); } }
    function onLeave(e) { if (e.pointerType === 'mouse') { st.hover = false; st.pointer.inside = false; } wake(); }
    function onClick(e) {
      if (st.suppressClick) { st.suppressClick = false; return; }
      var holder = e.target.closest && e.target.closest('[data-cc-index]');
      if (holder && o.focusOnClick) focusIndex(Number(holder.getAttribute('data-cc-index')));
    }
    function onKey(e) {
      if (e.key === 'ArrowRight') stepBy(1);
      else if (e.key === 'ArrowLeft') stepBy(-1);
      else return;
      e.preventDefault();
    }
    function onWheel(e) {
      if (!o.draggable || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      var perPixel = 180 / (Math.PI * radius * st.fit);
      st.target = null;
      st.angle -= e.deltaX * perPixel;
      st.velocity = -e.deltaX * perPixel * 30;
      st.holdUntil = performance.now() + 1600;
      clearTimeout(st.wheelTimer);
      st.wheelTimer = setTimeout(function () { if (o.snap) st.target = nearest(st.angle + st.velocity * 0.12); wake(); }, 140);
      wake();
    }
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);
    root.addEventListener('wheel', onWheel, { passive: false });
    var onVis = function () { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; st.last = 0; } else wake(); };
    document.addEventListener('visibilitychange', onVis);

    var ro = new ResizeObserver(function () { measure(); wake(); });
    ro.observe(root);
    var io = new IntersectionObserver(function (entries) {
      visible = entries.some(function (en) { return en.isIntersecting; });
      if (visible) wake(); else { cancelAnimationFrame(raf); raf = 0; st.last = 0; }
    });
    io.observe(root);

    measure();
    render(performance.now());
    root.classList.add('cc-ready');
    wake();

    return {
      destroy: function () {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        root.removeEventListener('wheel', onWheel);
      }
    };
  }

  window.CircularCarousel = CircularCarousel;
})();
