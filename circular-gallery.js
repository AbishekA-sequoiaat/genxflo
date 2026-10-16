/*
 * CircularGallery — vanilla JS / WebGL2 port of the React component.
 * Usage:
 *   const gallery = CircularGallery(containerElement, { items: [{ image, text, description }], bend: 3, ... });
 *   gallery.update({ bend: 2 });  gallery.open(0);  gallery.close();  gallery.destroy();
 * Styling lives in styles.css under the .cg-* classes.
 */
(function () {
  'use strict';

  var DEFAULT_FONT = 'bold 30px Figtree';
  var DEFAULT_FONT_URL = 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;700&display=swap';
  var SEGMENTS_X = 32;
  var SEGMENTS_Y = 24;
  var INTRO_SECONDS = 1.4;
  var WORLD_HEIGHT = 16.57;
  var STEPS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

  var VERTEX = `#version 300 es
in vec2 aPosition;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform vec2 uSize;
uniform float uAngle;
uniform float uPad;
uniform float uWave;
uniform float uWaveTime;
uniform float uFocal;
out vec2 vLocal;
void main() {
  vec2 local = aPosition * (uSize + 2.0 * uPad);
  vec2 unit = local / max(uSize, vec2(1.0));
  float z = uWave * (sin(unit.x * 4.0 + uWaveTime) + cos(unit.y * 2.0 + uWaveTime)) * 0.5;
  float depth = uFocal / max(uFocal - z, 1.0);
  float c = cos(uAngle);
  float s = sin(uAngle);
  vec2 turned = vec2(c * local.x - s * local.y, s * local.x + c * local.y);
  vLocal = local;
  gl_Position = vec4((uCenter + turned * depth) / (uResolution * 0.5), 0.0, 1.0);
}`;

  var FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uSize;
uniform float uRadius;
uniform float uImageAspect;
uniform float uReady;
uniform vec3 uPlaceholder;
uniform float uGray;
uniform float uDim;
uniform float uAlpha;
uniform float uRing;
uniform vec3 uRingColor;
uniform float uRingWidth;
uniform float uRingGap;
uniform float uFade;
uniform float uFadeAxis;
uniform float uBorderW;
uniform vec3 uBorderColor;
uniform float uShadow;
uniform float uBlur;
uniform vec2 uShadowOffset;
in vec2 vLocal;
out vec4 outColor;

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float smoother(float x) {
  x = clamp(x, 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

float edgeFade() {
  if (uFade <= 0.0) return 1.0;
  float u = uFadeAxis > 0.5 ? gl_FragCoord.y / uResolution.y : gl_FragCoord.x / uResolution.x;
  return smoother(u / uFade) * smoother((1.0 - u) / uFade);
}

void main() {
  vec2 extent = uSize * 0.5;
  if (uShadow > 0.0) {
    float d = roundBox(vLocal - uShadowOffset, extent, uRadius);
    float a = uShadow * (1.0 - smoothstep(-uBlur, uBlur, d)) * uAlpha * edgeFade();
    outColor = vec4(0.0, 0.0, 0.0, a);
    return;
  }
  float d = roundBox(vLocal, extent, uRadius);
  float pixel = max(length(vec2(dFdx(d), dFdy(d))), 1e-4);
  float cover = clamp(0.5 - d / pixel, 0.0, 1.0);
  vec2 uv = vLocal / uSize + 0.5;
  float aspect = uSize.x / uSize.y;
  vec2 crop = aspect > uImageAspect ? vec2(1.0, uImageAspect / aspect) : vec2(aspect / uImageAspect, 1.0);
  vec3 image = texture(uTexture, (uv - 0.5) * crop + 0.5).rgb;
  vec3 color = mix(uPlaceholder, image, uReady);
  float inner = clamp(0.5 - (d + uBorderW) / pixel, 0.0, 1.0);
  color = mix(color, uBorderColor, (1.0 - inner) * step(0.001, uBorderW));
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(color, vec3(luma), uGray) * (1.0 - uDim);
  float body = cover * mix(0.08, 1.0, uReady);
  float band = abs(d - uRingGap - uRingWidth * 0.5) - uRingWidth * 0.5;
  float ring = clamp(0.5 - band / pixel, 0.0, 1.0) * uRing;
  vec4 card = vec4(color * body, body);
  vec4 outline = vec4(uRingColor * ring, ring);
  outColor = (card + outline * (1.0 - card.a)) * uAlpha * edgeFade();
}`;

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function ease(value) { return value * value * (3 - 2 * value); }
  function wrap(value, length) { return ((value % length) + length) % length; }

  function deriveFontFamilyFromUrl(url) {
    var fileName = (url.split('/').pop() || 'custom-font').split('?')[0];
    var base = fileName.replace(/\.(woff2?|ttf|otf|eot)$/i, '');
    return base.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'CircularGalleryFont';
  }

  async function loadFontFromStylesheet(url) {
    var response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch font stylesheet (' + response.status + ')');
    var cssText = await response.text();
    var faceBlocks = cssText.match(/@font-face\s*{[^}]*}/g) || [];
    var family = null;
    var fontFaces = [];
    faceBlocks.forEach(function (block) {
      var familyMatch = block.match(/font-family:\s*['"]?([^;'"]+)['"]?/);
      var urlMatch = block.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
      if (!familyMatch || !urlMatch) return;
      family = familyMatch[1].trim();
      var descriptors = {};
      var weightMatch = block.match(/font-weight:\s*([^;]+);/);
      var styleMatch = block.match(/font-style:\s*([^;]+);/);
      var rangeMatch = block.match(/unicode-range:\s*([^;]+);/);
      if (weightMatch) descriptors.weight = weightMatch[1].trim();
      if (styleMatch) descriptors.style = styleMatch[1].trim();
      if (rangeMatch) descriptors.unicodeRange = rangeMatch[1].trim();
      fontFaces.push(new FontFace(family, 'url(' + urlMatch[1] + ')', descriptors));
    });
    if (!family) throw new Error('No @font-face rule found in the stylesheet');
    await Promise.allSettled(fontFaces.map(async function (face) { await face.load(); document.fonts.add(face); }));
    return family;
  }

  async function loadFontFromFile(url) {
    var family = deriveFontFamilyFromUrl(url);
    var fontFace = new FontFace(family, 'url(' + url + ')');
    await fontFace.load();
    document.fonts.add(fontFace);
    return family;
  }

  async function resolveFont(font, fontUrl) {
    var url = fontUrl || (font === DEFAULT_FONT ? DEFAULT_FONT_URL : null);
    if (!url) return font;
    try {
      var isStylesheet = url.includes('fonts.googleapis.com') || /\.css(\?.*)?$/i.test(url);
      var family = isStylesheet ? await loadFontFromStylesheet(url) : await loadFontFromFile(url);
      var sizeMatch = font.match(/^\s*(.*?\d+px)/);
      return (sizeMatch ? sizeMatch[1].trim() : 'bold 30px') + ' "' + family + '"';
    } catch (e) {
      return font;
    }
  }

  function fontScale(font) {
    var match = String(font).match(/(\d+(?:\.\d+)?)px/);
    return match ? parseFloat(match[1]) / 30 : 1;
  }

  function compile(gl, type, source) {
    var shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  }

  function link(gl) {
    var vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    var fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    var program = gl.createProgram();
    if (!vertex || !fragment || !program) return null;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    var uniforms = {};
    var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < count; i++) {
      var info = gl.getActiveUniform(program, i);
      if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    return { program: program, uniforms: uniforms };
  }

  var DEFAULT_ITEMS = [
    { image: 'https://picsum.photos/seed/1/800/600', text: 'Bridge' },
    { image: 'https://picsum.photos/seed/2/800/600', text: 'Desk Setup' },
    { image: 'https://picsum.photos/seed/3/800/600', text: 'Waterfall' },
    { image: 'https://picsum.photos/seed/4/800/600', text: 'Strawberries' }
  ];

  var DEFAULTS = {
    items: null,
    bend: 3,
    textColor: '#ffffff',
    borderRadius: 0.05,
    font: DEFAULT_FONT,
    fontUrl: '',
    scrollSpeed: 2,
    scrollEase: 0.05,
    itemSize: 1,
    itemAspect: 0.78,
    gap: 0.26,
    wave: 1,
    fadeEdges: 0.12,
    shadow: 0.25,
    grayscale: false,
    showTitles: true,
    snap: true,
    autoScroll: 0,
    openOnClick: true,
    intro: true,
    onItemClick: null,
    onActiveChange: null,
    direction: 'horizontal',
    borderWidth: 0,
    borderColor: '#ffffff',
    captureWheel: null,
    dpr: 0
  };

  function normalize(o) {
    var vertical = o.direction === 'vertical';
    var list = Array.isArray(o.items) && o.items.length ? o.items : DEFAULT_ITEMS;
    return {
      items: list,
      bend: o.bend,
      textColor: o.textColor,
      borderRadius: clamp(o.borderRadius, 0, 0.5),
      scrollSpeed: Math.max(0, o.scrollSpeed),
      scrollEase: clamp(o.scrollEase, 0.001, 1),
      itemSize: clamp(o.itemSize, 0.2, 2),
      itemAspect: clamp(o.itemAspect, 0.2, 5),
      gap: Math.max(0, o.gap),
      wave: Math.max(0, o.wave),
      fadeEdges: clamp(o.fadeEdges, 0, 0.5),
      shadow: clamp(o.shadow, 0, 1),
      grayscale: !!o.grayscale,
      showTitles: !!o.showTitles,
      snap: !!o.snap,
      autoScroll: o.autoScroll,
      openOnClick: !!o.openOnClick && !vertical,
      direction: vertical ? 'vertical' : 'horizontal',
      borderWidth: Math.max(0, o.borderWidth),
      borderColor: o.borderColor,
      intro: !!o.intro,
      onItemClick: o.onItemClick,
      onActiveChange: o.onActiveChange,
      captureWheel: o.captureWheel == null ? vertical : !!o.captureWheel,
      dpr: o.dpr
    };
  }

  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function CircularGallery(container, options) {
    var raw = Object.assign({}, DEFAULTS, options || {});
    var settings = normalize(raw);

    // markup
    container.classList.add('cg-root');
    container.setAttribute('role', 'region');
    container.setAttribute('aria-roledescription', 'carousel');
    container.setAttribute('aria-label', 'Image gallery');
    var canvas = el('canvas', 'cg-canvas', { 'aria-hidden': 'true' });
    var labelLayer = el('div', 'cg-labels', { 'aria-hidden': 'true' });
    var caption = el('div', 'cg-caption', { 'aria-hidden': 'true' });
    var captionText = el('p', '');
    caption.appendChild(captionText);
    var closeButton = el('button', 'cg-close', { type: 'button', 'data-gallery-close': '', tabindex: '-1', 'aria-label': 'Close' });
    closeButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    var listEl = el('ul', 'cg-sr', { 'data-gallery-list': '' });
    var liveEl = el('div', 'cg-sr', { 'aria-live': 'polite' });
    [canvas, labelLayer, caption, closeButton, listEl, liveEl].forEach(function (n) { container.appendChild(n); });

    function vert() { return settings.direction === 'vertical'; }
    function mainLen() { return vert() ? view.height : view.width; }
    function crossLen() { return vert() ? view.width : view.height; }
    container.classList.toggle('cg-vertical', vert());

    var buttons = [];
    var uiActive = 0;
    var uiOpen = false;

    var noop = { update: function () {}, open: function () {}, close: function () {}, destroy: function () { container.replaceChildren(); } };
    var gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) return noop;
    var program = link(gl);
    if (!program) return noop;
    var u = program.uniforms;

    var vertices = [];
    var x, y;
    for (y = 0; y <= SEGMENTS_Y; y++) {
      for (x = 0; x <= SEGMENTS_X; x++) vertices.push(x / SEGMENTS_X - 0.5, y / SEGMENTS_Y - 0.5);
    }
    var indices = [];
    for (y = 0; y < SEGMENTS_Y; y++) {
      for (x = 0; x < SEGMENTS_X; x++) {
        var a = y * (SEGMENTS_X + 1) + x;
        var b = a + 1;
        var c = a + SEGMENTS_X + 1;
        var d = c + 1;
        indices.push(a, b, d, a, d, c);
      }
    }
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    var anisotropy = gl.getExtension('EXT_texture_filter_anisotropic');
    var blank = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, blank);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

    var probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    var colorCache = new Map();
    function parse(value) {
      var key = String(value);
      if (colorCache.has(key)) return colorCache.get(key);
      var rgb = [1, 1, 1];
      if (probe) {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = '#ffffff';
        probe.fillStyle = key;
        probe.fillRect(0, 0, 1, 1);
        var px = probe.getImageData(0, 0, 1, 1).data;
        rgb = [px[0] / 255, px[1] / 255, px[2] / 255];
      }
      colorCache.set(key, rgb);
      return rgb;
    }

    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var textures = new Map();
    var view = { width: 1, height: 1, ratio: 1 };
    var state = {
      scroll: 0, target: 0, velocity: 0, open: 0, openTarget: 0,
      intro: settings.intro && !reduce ? 0 : 1,
      waveTime: 0, ring: 0, keyboard: false, hovered: null,
      hover: new Map(), focus: new Map(), drag: null, lastInput: 0, active: 0, spacing: 1
    };
    var cards = [];
    var pool = [];
    var raf = 0;
    var last = 0;
    var visible = true;
    var snapTimer = 0;
    var lastItems = null;
    var typing = false;
    var disposed = false;
    var currentFont = raw.font;

    // ui sync (replaces React state)
    function buildList() {
      listEl.replaceChildren();
      buttons = settings.items.map(function (item, index) {
        var li = document.createElement('li');
        var btn = el('button', '', { type: 'button' });
        btn.textContent = item.text || item.alt || ('Image ' + (index + 1));
        btn.addEventListener('focus', function () { setSlot(slotFor(index), false); });
        btn.addEventListener('click', function () { openSlot(slotFor(index)); });
        li.appendChild(btn);
        listEl.appendChild(li);
        return btn;
      });
      syncUi();
    }

    function syncUi() {
      var count = settings.items.length;
      var current = settings.items[uiActive % count] || settings.items[0];
      buttons.forEach(function (btn, index) {
        var item = settings.items[index];
        btn.tabIndex = index === uiActive ? 0 : -1;
        btn.setAttribute('aria-label', (item.text || item.alt || 'Image') + ', ' + (index + 1) + ' of ' + count);
        if (index === uiActive) btn.setAttribute('aria-current', 'true');
        else btn.removeAttribute('aria-current');
      });
      captionText.textContent = (current && current.description) || '';
      captionText.style.display = current && current.description ? '' : 'none';
      caption.setAttribute('aria-hidden', String(!uiOpen));
      closeButton.tabIndex = uiOpen ? 0 : -1;
      if (uiOpen) closeButton.setAttribute('data-visible', '');
      else closeButton.removeAttribute('data-visible');
      liveEl.textContent = uiOpen && current ? ((current.text || current.alt || 'Image') + ' opened') : '';
    }

    function setActiveUi(index) { uiActive = index; syncUi(); }
    function setOpenUi(value) { uiOpen = value; syncUi(); }

    function textureFor(url) {
      var existing = textures.get(url);
      if (existing) return existing;
      var entry = { texture: null, aspect: 1, ready: 0, loaded: false };
      textures.set(url, entry);
      var image = new Image();
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      image.onload = function () {
        if (!textures.has(url) || disposed) return;
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        if (anisotropy) {
          var max = gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
          gl.texParameterf(gl.TEXTURE_2D, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
        }
        entry.texture = texture;
        entry.aspect = image.naturalWidth / Math.max(1, image.naturalHeight);
        entry.loaded = true;
        wake();
      };
      image.src = url;
      return entry;
    }

    function prune(list) {
      var keep = new Set(list.map(function (item) { return item.image; }));
      textures.forEach(function (entry, url) {
        if (keep.has(url)) return;
        if (entry.texture) gl.deleteTexture(entry.texture);
        textures.delete(url);
      });
    }

    function measure() {
      var s = settings;
      if (vert()) {
        var wa = Math.min(view.width * 0.94, view.height * 0.55 * s.itemAspect) * s.itemSize;
        var ha = wa / s.itemAspect;
        return { w: wa, h: ha, spacing: ha * (1 + s.gap) };
      }
      var height = 0.6 * view.height * s.itemSize;
      var width = height * s.itemAspect;
      var scale = Math.min(1, (view.width * 0.82) / width);
      return { w: width * scale, h: height * scale, spacing: width * scale * (1 + s.gap) };
    }

    function arcOf(px) {
      var s = settings;
      if (!s.bend) return { y: 0, angle: 0 };
      var depth = (Math.abs(s.bend) * crossLen()) / WORLD_HEIGHT;
      var half = Math.max(mainLen(), crossLen() * 1.9) / 2;
      var radius = (half * half + depth * depth) / (2 * depth);
      var reach = Math.min(Math.abs(px), half, radius * 0.999);
      var arc = radius - Math.sqrt(radius * radius - reach * reach);
      var angle = Math.sign(px) * Math.asin(reach / radius);
      return s.bend > 0 ? { y: -arc, angle: -angle } : { y: arc, angle: angle };
    }

    function captionSize() { return clamp(view.height * 0.045, 15, 22); }

    function ensurePool(spacing) {
      var size = Math.ceil(mainLen() / Math.max(spacing, 1)) + 8;
      if (pool.length === size) return;
      labelLayer.replaceChildren();
      pool = Array.from({ length: size }, function () {
        var node = el('span', 'cg-label');
        node.style.opacity = '0';
        labelLayer.appendChild(node);
        return { el: node, slot: null, font: '', text: '' };
      });
    }

    function layout() {
      var s = settings;
      var list = s.items;
      var count = list.length;
      var m = measure();
      var w = m.w, h = m.h, spacing = m.spacing;
      state.spacing = spacing;
      var introEase = 1 - Math.pow(1 - state.intro, 3);
      var scroll = state.scroll + (1 - introEase) * spacing * 1.6;
      var margin = Math.max(20, Math.min(view.width, view.height) * 0.06);
      var baseLabel = h * 0.072 * fontScale(currentFont);
      function openFrame(item) {
        var aspect = textureFor(item.image).aspect || w / h;
        var titleSpace = item.text && s.showTitles ? captionSize() * 2.4 : 0;
        var captionSpace = titleSpace + (item.description ? 52 : 0);
        var width = Math.min(view.width - margin * 2, (view.height - margin * 2 - captionSpace) * aspect);
        return { width: width, height: width / aspect, y: captionSpace / 2, titleSpace: titleSpace };
      }
      var activeFrame = openFrame(list[wrap(state.active, count)]);
      var spread = Math.max(0, activeFrame.width / 2 - w / 2);
      var activeX = state.active * spacing - scroll;
      var first = Math.floor((scroll - mainLen() / 2 - spacing * 2) / spacing);
      var lastSlot = Math.ceil((scroll + mainLen() / 2 + spacing * 2) / spacing);
      var next = [];
      var lead = null;
      for (var slot = first; slot <= lastSlot; slot++) {
        var index = wrap(slot, count);
        var item = list[index];
        var entry = textureFor(item.image);
        var focus = ease(state.focus.get(slot) || 0);
        var cx = slot * spacing - scroll;
        cx += Math.sign(cx - activeX) * state.open * (1 - focus) * spread;
        var arc = arcOf(cx);
        var px = vert() ? -arc.y : cx;
        var py = vert() ? -cx : arc.y;
        var tilt = vert() ? -arc.angle : arc.angle;
        var frame = focus > 0 ? openFrame(item) : activeFrame;
        var order = Math.abs(slot * spacing - state.scroll) / spacing;
        var shown = ease(clamp(state.intro * 2.2 - order * 0.22, 0, 1));
        var hover = state.hover.get(slot) || 0;
        var lift = 1 + hover * 0.04 * (1 - focus);
        var card = {
          slot: slot, index: index, item: item, entry: entry,
          x: mix(px, 0, focus),
          y: mix(py, frame.y, focus) - (1 - shown) * h * 0.18,
          angle: tilt * (1 - focus),
          w: mix(w, frame.width, focus) * lift,
          h: mix(h, frame.height, focus) * lift,
          radius: s.borderRadius * Math.min(w, h),
          alpha: shown * mix(1, 0.12, state.open * (1 - focus)),
          dim: state.open * (1 - focus) * 0.4,
          gray: s.grayscale ? 1 - Math.max(hover, focus, slot === state.active ? state.ring : 0) : 0,
          focus: focus,
          labelAlpha: mix(1 - state.open, 1, focus),
          labelSize: mix(baseLabel, captionSize(), focus),
          frame: frame
        };
        if (!lead || focus > lead.focus) lead = card;
        next.push(card);
      }
      next.sort(function (p, q) { return p.focus - q.focus || Math.abs(q.x) - Math.abs(p.x); });
      cards = next;
      var f = lead && lead.focus > 0 ? lead.frame : activeFrame;
      return { w: w, h: h, spacing: spacing, openH: f.height, openY: f.y, titleSpace: f.titleSpace };
    }

    function draw(metrics) {
      var s = settings;
      var ratio = view.ratio;
      var speed = Math.min(Math.abs(state.velocity) / Math.max(metrics.spacing * 4, 1), 1);
      var wavePx = reduce ? 0 : s.wave * speed * view.height * 0.08 * ratio;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program.program);
      gl.bindVertexArray(vao);
      gl.uniform2f(u.uResolution, canvas.width, canvas.height);
      gl.uniform1f(u.uFocal, view.height * 1.207 * ratio);
      gl.uniform1f(u.uWaveTime, state.waveTime);
      gl.uniform1f(u.uFade, s.fadeEdges);
      gl.uniform1f(u.uFadeAxis, vert() ? 1 : 0);
      gl.uniform1f(u.uBorderW, s.borderWidth * ratio);
      gl.uniform3fv(u.uBorderColor, parse(s.borderColor));
      gl.uniform3fv(u.uPlaceholder, parse(s.textColor));
      gl.uniform3fv(u.uRingColor, parse(s.textColor));
      gl.uniform1f(u.uRingWidth, 2 * ratio);
      gl.uniform1f(u.uRingGap, 5 * ratio);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(u.uTexture, 0);
      var count = SEGMENTS_X * SEGMENTS_Y * 6;
      var blur = Math.max(10, metrics.h * 0.09) * ratio;
      function place(card) {
        gl.uniform2f(u.uCenter, card.x * ratio, card.y * ratio);
        gl.uniform2f(u.uSize, card.w * ratio, card.h * ratio);
        gl.uniform1f(u.uAngle, card.angle);
        gl.uniform1f(u.uRadius, Math.min(card.radius, card.w / 2, card.h / 2) * ratio);
        gl.uniform1f(u.uWave, wavePx * (1 - card.focus));
        gl.uniform1f(u.uAlpha, card.alpha);
      }
      if (s.shadow > 0) {
        gl.uniform1f(u.uShadow, s.shadow);
        gl.uniform1f(u.uBlur, blur);
        gl.uniform2f(u.uShadowOffset, 0, -blur * 0.45);
        gl.uniform1f(u.uPad, blur * 1.6);
        gl.bindTexture(gl.TEXTURE_2D, blank);
        cards.forEach(function (card) {
          place(card);
          gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
        });
      }
      gl.uniform1f(u.uShadow, 0);
      gl.uniform1f(u.uPad, 10 * ratio);
      cards.forEach(function (card) {
        place(card);
        var entry = card.entry;
        gl.bindTexture(gl.TEXTURE_2D, entry.texture || blank);
        gl.uniform1f(u.uImageAspect, entry.aspect);
        gl.uniform1f(u.uReady, entry.ready);
        gl.uniform1f(u.uGray, card.gray);
        gl.uniform1f(u.uDim, card.dim);
        gl.uniform1f(u.uRing, card.slot === state.active ? state.ring * (1 - card.focus) : 0);
        gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
      });
    }

    function placeLabels(metrics) {
      var s = settings;
      ensurePool(metrics.spacing);
      var used = new Set();
      var font = currentFont;
      function fade(value) {
        if (s.fadeEdges <= 0) return 1;
        var t = clamp(value / s.fadeEdges, 0, 1);
        return t * t * t * (t * (t * 6 - 15) + 10);
      }
      if (s.showTitles) {
        cards.forEach(function (card) {
          if (!card.item.text) return;
          var entry = pool[wrap(card.slot, pool.length)];
          used.add(entry);
          if (entry.slot !== card.slot || entry.text !== card.item.text) {
            entry.slot = card.slot;
            entry.text = card.item.text;
            entry.el.textContent = card.item.text;
          }
          if (entry.font !== font) {
            entry.font = font;
            entry.el.style.font = font;
          }
          var size = card.labelSize;
          var offset = card.h / 2 + size * 1.1;
          var lx = card.x + Math.sin(card.angle) * offset;
          var ly = card.y - Math.cos(card.angle) * offset;
          var cssX = view.width / 2 + lx;
          var cssY = view.height / 2 - ly;
          var edge = vert() ? fade(cssY / view.height) * fade(1 - cssY / view.height) : fade(cssX / view.width) * fade(1 - cssX / view.width);
          entry.el.style.fontSize = size + 'px';
          entry.el.style.color = s.textColor;
          entry.el.style.transform = 'translate(' + cssX + 'px, ' + cssY + 'px) translate(-50%, -50%) rotate(' + (-card.angle) + 'rad)';
          entry.el.style.opacity = String(card.alpha * card.labelAlpha * mix(edge, 1, card.focus));
        });
      }
      pool.forEach(function (entry) {
        if (used.has(entry)) return;
        if (entry.el.style.opacity !== '0') entry.el.style.opacity = '0';
      });
      var top = view.height / 2 - (metrics.openY - metrics.openH / 2) + metrics.titleSpace + 4;
      caption.style.transform = 'translate(-50%, ' + top + 'px)';
      caption.style.opacity = String(ease(clamp((state.open - 0.5) / 0.5, 0, 1)));
      caption.style.color = s.textColor;
      if (caption.dataset.font !== font) {
        caption.dataset.font = font;
        caption.style.font = font;
        caption.style.fontWeight = '400';
      }
      caption.style.fontSize = (captionSize() * 0.8) + 'px';
    }

    function nearest() { return Math.round(state.target / Math.max(state.spacing, 1)); }

    function slotFor(index) {
      var count = settings.items.length;
      var slot = nearest();
      var base = slot - wrap(slot, count) + index;
      return [base - count, base, base + count].reduce(function (best, value) {
        return Math.abs(value - slot) < Math.abs(best - slot) ? value : best;
      });
    }

    function setSlot(slot, announce) {
      if (announce === undefined) announce = true;
      state.target = slot * state.spacing;
      if (slot !== state.active) {
        state.active = slot;
        var index = wrap(slot, settings.items.length);
        if (announce) setActiveUi(index);
        if (settings.onActiveChange) settings.onActiveChange(index);
      }
      wake();
    }

    function openSlot(slot) {
      setSlot(slot);
      state.openTarget = 1;
      setOpenUi(true);
      wake();
    }

    function close() {
      state.openTarget = 0;
      setOpenUi(false);
      wake();
    }

    function frame(now) {
      raf = 0;
      if (disposed || !visible || document.hidden) return;
      var s = settings;
      var dt = last ? clamp((now - last) / 1000, 0.0005, 0.05) : 1 / 60;
      last = now;
      if (s.items !== lastItems) {
        lastItems = s.items;
        prune(s.items);
        s.items.forEach(function (item) { textureFor(item.image); });
      }
      var idle = now - state.lastInput > 1800;
      var auto = s.autoScroll && !reduce && !state.drag && state.open < 0.01 && state.hovered === null && !state.keyboard && idle;
      if (auto) state.target += s.autoScroll * state.spacing * 0.25 * dt;
      var follow = reduce ? 1 : 1 - Math.pow(1 - s.scrollEase, dt * 60);
      var before = state.scroll;
      state.scroll += (state.target - state.scroll) * follow;
      if (Math.abs(state.target - state.scroll) < 0.05) state.scroll = state.target;
      var velocity = (state.scroll - before) / dt;
      state.velocity += (velocity - state.velocity) * (1 - Math.exp(-dt / 0.08));
      if (Math.abs(state.velocity) < 0.5) state.velocity = 0;
      state.waveTime += dt * 2.4;
      var openFollow = reduce ? 1 : 1 - Math.exp(-dt / 0.14);
      state.open += (state.openTarget - state.open) * openFollow;
      if (Math.abs(state.openTarget - state.open) < 0.001) state.open = state.openTarget;
      state.ring += ((state.keyboard ? 1 : 0) - state.ring) * (1 - Math.exp(-dt / 0.1));
      if (Math.abs((state.keyboard ? 1 : 0) - state.ring) < 0.002) state.ring = state.keyboard ? 1 : 0;
      if (state.intro < 1) state.intro = Math.min(1, state.intro + dt / INTRO_SECONDS);
      var settling = false;
      state.hover.forEach(function (value, slot) {
        var goal = slot === state.hovered ? 1 : 0;
        var nxt = value + (goal - value) * (1 - Math.exp(-dt / 0.12));
        if (Math.abs(goal - nxt) < 0.002) {
          if (goal === 0) state.hover.delete(slot);
          else state.hover.set(slot, 1);
        } else {
          state.hover.set(slot, nxt);
          settling = true;
        }
      });
      if (state.openTarget > 0 && !state.focus.has(state.active)) state.focus.set(state.active, 0);
      state.focus.forEach(function (value, slot) {
        var goal = state.openTarget > 0 && slot === state.active ? 1 : 0;
        var nxt = reduce ? goal : value + (goal - value) * (1 - Math.exp(-dt / 0.16));
        if (Math.abs(goal - nxt) < 0.001) {
          if (goal === 0) state.focus.delete(slot);
          else state.focus.set(slot, 1);
        } else {
          state.focus.set(slot, nxt);
          settling = true;
        }
      });
      textures.forEach(function (entry) {
        if (!entry.loaded || entry.ready >= 1) return;
        entry.ready = reduce ? 1 : Math.min(1, entry.ready + dt / 0.45);
        settling = true;
      });
      var slotNow = auto ? Math.round(state.scroll / Math.max(state.spacing, 1)) : nearest();
      if (slotNow !== state.active && !state.drag) {
        state.active = slotNow;
        var index = wrap(slotNow, s.items.length);
        setActiveUi(index);
        if (s.onActiveChange) s.onActiveChange(index);
      }
      var metrics = layout();
      draw(metrics);
      placeLabels(metrics);
      var moving = (s.autoScroll && !reduce) || state.scroll !== state.target || state.velocity !== 0 ||
        state.open !== state.openTarget || state.intro < 1 || (state.ring !== 0 && state.ring !== 1) || settling;
      if (moving) raf = requestAnimationFrame(frame);
      else last = 0;
    }

    function wake() {
      if (!raf && !disposed && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }

    function resize() {
      view.width = Math.max(1, container.clientWidth);
      view.height = Math.max(1, container.clientHeight);
      view.ratio = Math.min(settings.dpr || window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(view.width * view.ratio));
      canvas.height = Math.max(1, Math.round(view.height * view.ratio));
      var before = state.spacing;
      var spacing = measure().spacing;
      if (before > 1 && spacing !== before) {
        state.scroll = (state.scroll / before) * spacing;
        state.target = (state.target / before) * spacing;
      }
      state.spacing = spacing;
      wake();
    }

    function point(event) {
      var rect = container.getBoundingClientRect();
      return { x: event.clientX - rect.left - rect.width / 2, y: rect.height / 2 - (event.clientY - rect.top) };
    }

    function hit(p) {
      for (var i = cards.length - 1; i >= 0; i--) {
        var card = cards[i];
        if (card.alpha < 0.05) continue;
        var dx = p.x - card.x;
        var dy = p.y - card.y;
        var cs = Math.cos(-card.angle);
        var sn = Math.sin(-card.angle);
        var lx = cs * dx - sn * dy;
        var ly = sn * dx + cs * dy;
        if (Math.abs(lx) <= card.w / 2 && Math.abs(ly) <= card.h / 2) return card;
      }
      return null;
    }

    function setPointer(card) {
      var slot = card ? card.slot : null;
      if (slot !== state.hovered) {
        state.hovered = slot;
        if (slot !== null && !state.hover.has(slot)) state.hover.set(slot, 0);
        wake();
      }
      if (card) container.setAttribute('data-pointer', '');
      else container.removeAttribute('data-pointer');
    }

    function snapNow() {
      if (!settings.snap && state.open < 0.5) return;
      setSlot(nearest());
    }

    function onPointerDown(event) {
      if (event.button !== 0 || event.target.closest('[data-gallery-close]')) return;
      state.drag = { id: event.pointerId, x0: event.clientX, y0: event.clientY, start: state.target, moved: false, samples: [], p: point(event) };
      state.lastInput = performance.now();
      wake();
    }

    function onPointerMove(event) {
      var drag = state.drag;
      if (drag && drag.id === event.pointerId) {
        var dx = event.clientX - drag.x0;
        var dy = event.clientY - drag.y0;
        var along = vert() ? dy : dx;
        if (!drag.moved && Math.hypot(dx, dy) > 6) {
          var across = vert() ? Math.abs(dx) > Math.abs(dy) : Math.abs(dy) > Math.abs(dx);
          if (across && event.pointerType !== 'mouse') { state.drag = null; return; }
          drag.moved = true;
          if (container.setPointerCapture) container.setPointerCapture(event.pointerId);
          container.setAttribute('data-dragging', '');
          setPointer(null);
        }
        if (drag.moved) {
          state.target = drag.start - along * (settings.scrollSpeed / 2);
          drag.samples.push({ x: vert() ? event.clientY : event.clientX, t: performance.now() });
          if (drag.samples.length > 6) drag.samples.shift();
          state.lastInput = performance.now();
          wake();
        }
        return;
      }
      if (event.pointerType === 'mouse') setPointer(hit(point(event)));
    }

    function onPointerUp(event) {
      var drag = state.drag;
      if (!drag || drag.id !== event.pointerId) return;
      state.drag = null;
      container.removeAttribute('data-dragging');
      if (container.hasPointerCapture && container.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId);
      if (drag.moved) {
        var samples = drag.samples;
        if (samples.length > 1) {
          var a0 = samples[0];
          var b0 = samples[samples.length - 1];
          var span = Math.max(b0.t - a0.t, 16);
          var speed = ((b0.x - a0.x) / span) * 1000;
          state.target -= speed * 0.18 * (settings.scrollSpeed / 2);
        }
        snapNow();
        return;
      }
      var card = hit(drag.p);
      if (!card) {
        if (state.open > 0.5) close();
        return;
      }
      if (settings.onItemClick) settings.onItemClick(card.item, card.index);
      if (!settings.openOnClick) { setSlot(card.slot); return; }
      if (state.open > 0.5 && card.slot === state.active) close();
      else openSlot(card.slot);
    }

    function onPointerCancel(event) {
      if (state.drag && state.drag.id === event.pointerId) {
        state.drag = null;
        container.removeAttribute('data-dragging');
        snapNow();
      }
    }

    function onPointerLeave() { setPointer(null); }

    function onWheel(event) {
      var unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? view.height : 1;
      var delta = vert() ? event.deltaY : (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY);
      if (!delta) return;
      // by default only capture the wheel along the gallery's own axis
      if (!settings.captureWheel && (vert() || Math.abs(event.deltaX) <= Math.abs(event.deltaY))) return;
      event.preventDefault();
      state.target += delta * unit * (settings.scrollSpeed / 2);
      state.lastInput = performance.now();
      clearTimeout(snapTimer);
      snapTimer = setTimeout(snapNow, 140);
      wake();
    }

    function onKeyDown(event) {
      var step = STEPS[event.key];
      state.lastInput = performance.now();
      if (step) {
        event.preventDefault();
        if (container.contains(document.activeElement) && document.activeElement !== container) state.keyboard = true;
        setSlot(nearest() + step);
        var index = wrap(state.active, settings.items.length);
        if (container.contains(document.activeElement) && buttons[index]) buttons[index].focus({ preventScroll: true });
        return;
      }
      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        var base = nearest() - wrap(nearest(), settings.items.length);
        setSlot(event.key === 'Home' ? base : base + settings.items.length - 1);
        return;
      }
      if (event.key === 'Escape' && state.openTarget > 0) {
        event.preventDefault();
        close();
      }
    }

    function onFocusIn(event) {
      if (!event.target.closest('[data-gallery-list]')) return;
      state.keyboard = typing || event.target.matches(':focus-visible');
      wake();
    }
    function onAnyKey(event) { if (event.key === 'Tab' || event.key.indexOf('Arrow') === 0) typing = true; }
    function onAnyPointer() { typing = false; }
    function onFocusOut(event) {
      if (container.contains(event.relatedTarget)) return;
      state.keyboard = false;
      wake();
    }
    function onVisibility() { last = 0; wake(); }
    function onClose() { close(); }

    var resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    var intersection = new IntersectionObserver(function (entries) {
      visible = entries.some(function (entry) { return entry.isIntersecting; });
      if (visible) { last = 0; wake(); }
    });
    intersection.observe(container);
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerCancel);
    container.addEventListener('pointerleave', onPointerLeave);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('keydown', onKeyDown);
    container.addEventListener('focusin', onFocusIn);
    container.addEventListener('focusout', onFocusOut);
    closeButton.addEventListener('click', onClose);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('keydown', onAnyKey, true);
    document.addEventListener('pointerdown', onAnyPointer, true);

    function applyFont() {
      currentFont = raw.font;
      resolveFont(raw.font, raw.fontUrl).then(function (resolved) {
        if (disposed) return;
        currentFont = resolved;
        wake();
      });
    }

    lastItems = settings.items;
    lastItems.forEach(function (item) { textureFor(item.image); });
    buildList();
    applyFont();
    resize();

    return {
      update: function (next) {
        next = next || {};
        var fontChanged = ('font' in next && next.font !== raw.font) || ('fontUrl' in next && next.fontUrl !== raw.fontUrl);
        var itemsChanged = 'items' in next && next.items !== raw.items;
        raw = Object.assign(raw, next);
        settings = normalize(raw);
        container.classList.toggle('cg-vertical', vert());
        if (itemsChanged) buildList();
        if (fontChanged) applyFont();
        resize();
      },
      open: function (index) { openSlot(slotFor(index)); },
      close: close,
      destroy: function () {
        disposed = true;
        cancelAnimationFrame(raf);
        clearTimeout(snapTimer);
        resizeObserver.disconnect();
        intersection.disconnect();
        container.removeEventListener('pointerdown', onPointerDown);
        container.removeEventListener('pointermove', onPointerMove);
        container.removeEventListener('pointerup', onPointerUp);
        container.removeEventListener('pointercancel', onPointerCancel);
        container.removeEventListener('pointerleave', onPointerLeave);
        container.removeEventListener('wheel', onWheel);
        container.removeEventListener('keydown', onKeyDown);
        container.removeEventListener('focusin', onFocusIn);
        container.removeEventListener('focusout', onFocusOut);
        closeButton.removeEventListener('click', onClose);
        document.removeEventListener('visibilitychange', onVisibility);
        document.removeEventListener('keydown', onAnyKey, true);
        document.removeEventListener('pointerdown', onAnyPointer, true);
        textures.forEach(function (entry) { if (entry.texture) gl.deleteTexture(entry.texture); });
        gl.deleteTexture(blank);
        gl.deleteProgram(program.program);
        gl.deleteBuffer(vertexBuffer);
        gl.deleteBuffer(indexBuffer);
        gl.deleteVertexArray(vao);
        var lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
        container.replaceChildren();
        container.classList.remove('cg-root');
      }
    };
  }

  window.CircularGallery = CircularGallery;
})();
