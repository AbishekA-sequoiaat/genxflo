/*
 * why-cube.js — vanilla JS (ES module) port of the React "CubeAnimation" component.
 *   <div data-cube data-src="modals/cube/cube.glb"></div>
 * The cube's animation is driven by scroll position (instead of GSAP ScrollTrigger scrubbing):
 * as the cards in the section scroll past, the cube plays from start to end, smoothed like scrub: 0.5.
 * If the .glb is missing a procedural 3x3x3 cube that twists and bursts apart is used.
 * Also reveals the cards one by one as they scroll into view.
 * Needs an import map that maps "three" to vendor/three/three.module.min.js.
 */
import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/GLTFLoader.js';


function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

// ---- procedural cube: a real 3x3x3 that starts scrambled and is solved one layer-turn at a time ----
var FACE_COLORS = { px: '#0a7d52', nx: '#14935f', py: '#f2fff9', ny: '#b6f26a', pz: '#4ce3a3', nz: '#19c9d0' };
var AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
// the scramble that was applied to a solved cube; solving plays it backwards, each move inverted
var SCRAMBLE = [
  ['x', 1, 1], ['y', 1, 1], ['z', 1, -1], ['x', -1, 1], ['y', -1, -1], ['z', -1, 1], ['x', 1, -1],
  ['y', 1, -1], ['z', 1, 1], ['x', -1, -1], ['y', -1, 1], ['z', -1, -1]
];
var SOLVE = SCRAMBLE.slice().reverse().map(function (m) { return [m[0], m[1], -m[2]]; });

function easeTurn(t) { var x = clamp((t - 0.08) / 0.84, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

function roundedPlane(size, radius) {
  var h = size / 2, r = radius, sh = new THREE.Shape();
  sh.moveTo(-h + r, -h); sh.lineTo(h - r, -h); sh.quadraticCurveTo(h, -h, h, -h + r);
  sh.lineTo(h, h - r); sh.quadraticCurveTo(h, h, h - r, h); sh.lineTo(-h + r, h);
  sh.quadraticCurveTo(-h, h, -h, h - r); sh.lineTo(-h, -h + r); sh.quadraticCurveTo(-h, -h, -h + r, -h);
  return new THREE.ShapeGeometry(sh, 4);
}

function buildCube() {
  var group = new THREE.Group();
  var body = new THREE.BoxGeometry(0.97, 0.97, 0.97);
  var bodyMat = new THREE.MeshPhysicalMaterial({ color: '#9fe3c3', metalness: 0.15, roughness: 0.35, clearcoat: 0.6 });
  var plane = roundedPlane(0.8, 0.14);
  var stickerMats = {};
  Object.keys(FACE_COLORS).forEach(function (k) {
    stickerMats[k] = new THREE.MeshPhysicalMaterial({ color: FACE_COLORS[k], metalness: 0.05, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
  });
  var faces = [
    ['px', [1, 0, 0], [0, Math.PI / 2, 0]], ['nx', [-1, 0, 0], [0, -Math.PI / 2, 0]],
    ['py', [0, 1, 0], [-Math.PI / 2, 0, 0]], ['ny', [0, -1, 0], [Math.PI / 2, 0, 0]],
    ['pz', [0, 0, 1], [0, 0, 0]], ['nz', [0, 0, -1], [0, Math.PI, 0]]
  ];
  var cubelets = [];
  for (var x = -1; x <= 1; x++) for (var y = -1; y <= 1; y++) for (var z = -1; z <= 1; z++) {
    var node = new THREE.Group();
    node.add(new THREE.Mesh(body, bodyMat));
    faces.forEach(function (f) {
      if ((f[1][0] && f[1][0] !== x) || (f[1][1] && f[1][1] !== y) || (f[1][2] && f[1][2] !== z)) return;
      var st = new THREE.Mesh(plane, stickerMats[f[0]]);
      st.position.set(f[1][0] * 0.489, f[1][1] * 0.489, f[1][2] * 0.489);
      st.rotation.set(f[2][0], f[2][1], f[2][2]);
      node.add(st);
    });
    group.add(node);
    cubelets.push({ node: node, pos: new THREE.Vector3(x, y, z), quat: new THREE.Quaternion() });
  }

  function turn(state, move, angle) {            // rotate the cubelets of one outer layer about a world axis
    var axis = AXES[move[0]], q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    state.forEach(function (c) {
      if (Math.round(c.pos[move[0]]) === move[1]) { c.pos.applyQuaternion(q); c.quat.premultiply(q); }
    });
  }
  function snap(state) { state.forEach(function (c) { c.pos.set(Math.round(c.pos.x), Math.round(c.pos.y), Math.round(c.pos.z)); }); }
  function clone(state) { return state.map(function (c) { return { pos: c.pos.clone(), quat: c.quat.clone() }; }); }

  // pre-compute the state before every solving move (state[0] is the scrambled cube)
  var states = [];
  var cur = clone(cubelets);
  SCRAMBLE.forEach(function (m) { turn(cur, m, m[2] * Math.PI / 2); snap(cur); });
  states.push(clone(cur));
  SOLVE.forEach(function (m) { turn(cur, m, m[2] * Math.PI / 2); snap(cur); states.push(clone(cur)); });

  return {
    group: group,
    update: function (p) {
      var n = SOLVE.length;
      var f = clamp(p, 0, 1) * n;
      var k = Math.min(n - 1, Math.floor(f));
      var t = p >= 1 ? 1 : easeTurn(f - k);
      var state = clone(states[k]);
      turn(state, SOLVE[k], SOLVE[k][2] * (Math.PI / 2) * t);
      for (var i = 0; i < cubelets.length; i++) {
        cubelets[i].node.position.copy(state[i].pos);
        cubelets[i].node.quaternion.copy(state[i].quat);
      }
      group.rotation.y = 0.75 + p * Math.PI * 0.8;
      group.rotation.x = 0.5;
    }
  };
}

function mount(host) {
  var src = host.getAttribute('data-src');
  var low = !!window.GX_LOW;
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: !low, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
  host.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 1.3));
  var spot = new THREE.SpotLight(0xffffff, 380, 100, Math.PI / 3, 0.5); spot.position.set(10, 15, 10); scene.add(spot);
  var fill = new THREE.DirectionalLight(0xffffff, 1.6); fill.position.set(-5, 10, 5); scene.add(fill);
  var rim = new THREE.DirectionalLight(0x7affc0, 1.1); rim.position.set(0, 5, -10); scene.add(rim);

  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(4.6, 3.2, 6.2);
  camera.lookAt(0, 0, 0);

  var model = null;      // { group, update(p) }
  var mixer = null, duration = 0;

  function useProcedural() {
    model = buildCube();
    scene.add(model.group);
    host.setAttribute('data-cube-ready', 'procedural');
    dirty = true;
  }

  if (src) {
    new GLTFLoader().load(src, function (gltf) {
      var object = gltf.scene;
      var box = new THREE.Box3().setFromObject(object);
      var size = box.getSize(new THREE.Vector3());
      object.position.sub(box.getCenter(new THREE.Vector3()));
      var wrap = new THREE.Group();
      wrap.add(object);
      wrap.scale.setScalar(3.4 / Math.max(size.x, size.y, size.z));
      scene.add(wrap);
      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(object);
        var action = mixer.clipAction(gltf.animations[0]);
        action.play();
        duration = gltf.animations[0].duration;
      }
      model = { group: wrap, update: function (p) { if (mixer) mixer.setTime(p * duration); } };
      host.setAttribute('data-cube-ready', 'model');
      dirty = true;
    }, undefined, useProcedural);
  } else useProcedural();

  function resize() {
    var w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(host);

  // scroll progress: measured over the column of cards beside the cube
  var track = host.closest('.wy-layout') ? host.closest('.wy-layout').querySelector('.wy-right') : (host.closest('.wg-wrap') || host.parentNode);
  function progress() {
    var r = track.getBoundingClientRect();
    var vh = window.innerHeight;
    return clamp((vh * 0.55 - r.top) / Math.max(r.height - vh * 0.1, 1), 0, 1);
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var shown = 0, target = 0, visible = true, raf = 0, last = 0, drawn = -1, dirty = true;
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    raf = requestAnimationFrame(frame);
    var dt = last ? Math.min((now - last) / 1000, 0.1) : 0.016;
    last = now;
    target = progress();
    shown += (target - shown) * (reduce ? 1 : 1 - Math.exp(-dt / 0.16));   // smoothing like scrub: 0.5
    // scroll-driven only: nothing moves while the scroll position is still, so skip redrawing the same frame
    if (!model || (!dirty && Math.abs(shown - drawn) < 0.0004)) return;
    model.update(shown);
    renderer.render(scene, camera);
    drawn = shown; dirty = false;
  }
  new IntersectionObserver(function (entries) {
    visible = entries.some(function (e) { return e.isIntersecting; });
    if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  }, { rootMargin: '120px 0px' }).observe(host);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && visible && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  });
  raf = requestAnimationFrame(frame);
}

// cards come in one by one as they scroll into view
function revealCards() {
  var cards = [].slice.call(document.querySelectorAll('.wy-card'));
  window.__wyReady = true;
  if (!cards.length) return;
  if (!('IntersectionObserver' in window)) { cards.forEach(function (c) { c.classList.add('is-in'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  cards.forEach(function (c) { io.observe(c); });
}

revealCards();
[].forEach.call(document.querySelectorAll('[data-cube]'), mount);
