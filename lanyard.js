/*
 * lanyard.js — vanilla JS (ES module) port of the React <Lanyard /> component.
 * A badge card hangs from a physically simulated strap: drag it to swing it, click it to flip it.
 * This build puts a live <video> on the front of the card (VideoTexture) instead of a still image.
 *
 *   <div data-lanyard data-video="hero-video"></div>      (data-video = id of an existing <video> element)
 *
 * Needs an import map that maps "three" to vendor/three/three.module.min.js.
 */
import * as THREE from 'three';

var CARD_WIDTH = 3.0;
var VIDEO_ASPECT = 1918 / 1000;
var PAD = 0.06;          // green margin around the video
var TOP_ZONE = 0.28;      // green band at the top, holding the strap slot
var VIDEO_W = CARD_WIDTH - PAD * 2;
var VIDEO_H = VIDEO_W / VIDEO_ASPECT;
var CARD_H = TOP_ZONE + VIDEO_H + PAD;
var THICKNESS = 0.018;
var BEVEL = 0.007;
var JOINTS = 4;
var NODE_WEIGHT = 1 / 0.05;
var MAX_STEP = 1 / 960;
var ITERATIONS = 2;
var SAMPLES = 72;
var FOV = 24;
var STRAP_WIDTH = 0.36;
var RING_RADIUS = 0.095;
var RING_TUBE = 0.0135;
var EYELET_RADIUS = 0.036;
var CLAMP_BODY = 0.15;
var FACE_WIDTH = 1024;
var BAND_COLUMNS = [0, 0.07, 0.93, 1];
var BAND_BEND = [-0.95, -0.28, 0.28, 0.95];
var FLIP_SPIN = 9;
var FINISH = { roughness: 0.28, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06 };
var METAL = { color: '#d9dce2', roughness: 0.16 };

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function mix(a, b, t) { return a + (b - a) * t; }

function parseColor(value, fallback) {
  try {
    var ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return fallback;
    ctx.fillStyle = '#000000';
    ctx.fillStyle = value;
    var resolved = ctx.fillStyle;
    if (resolved.charAt(0) === '#') {
      var n = parseInt(resolved.slice(1), 16);
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }
    var parts = resolved.match(/[0-9.]+/g);
    if (!parts || parts.length < 3) return fallback;
    return [Number(parts[0]) / 255, Number(parts[1]) / 255, Number(parts[2]) / 255];
  } catch (e) { return fallback; }
}
function luminance(rgb) { return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]; }
function toCss(rgb, alpha) {
  return 'rgba(' + Math.round(rgb[0] * 255) + ', ' + Math.round(rgb[1] * 255) + ', ' + Math.round(rgb[2] * 255) + ', ' + (alpha == null ? 1 : alpha) + ')';
}
function seeded(start) {
  var state = start >>> 0;
  return function () {
    state = (state + 0x6d2b79f5) >>> 0;
    var t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function traceRoundedRect(path, x, y, width, height, radius) {
  var r = Math.max(0, Math.min(radius, width / 2, height / 2));
  var k = r * 0.4477;
  path.moveTo(x + r, y);
  path.lineTo(x + width - r, y);
  path.bezierCurveTo(x + width - k, y, x + width, y + k, x + width, y + r);
  path.lineTo(x + width, y + height - r);
  path.bezierCurveTo(x + width, y + height - k, x + width - k, y + height, x + width - r, y + height);
  path.lineTo(x + r, y + height);
  path.bezierCurveTo(x + k, y + height, x, y + height - k, x, y + height - r);
  path.lineTo(x, y + r);
  path.bezierCurveTo(x, y + k, x + k, y, x + r, y);
}

function cardLayout(cornerRadius) {
  var width = CARD_WIDTH, height = CARD_H;
  var radius = mix(0.03, Math.min(width, height) * 0.2, clamp(cornerRadius, 0, 1));
  var slot = { width: 0.34, height: 0.07, y: height / 2 - 0.13 };
  var ringY = height / 2 - 0.055;
  return { width: width, height: height, radius: radius, slot: slot, ringY: ringY, hangY: ringY + RING_RADIUS };
}

function buildCardGeometry(layout) {
  var width = layout.width, height = layout.height, radius = layout.radius, slot = layout.slot;
  var outline = new THREE.Shape();
  traceRoundedRect(outline, -width / 2 + BEVEL, -height / 2 + BEVEL, width - BEVEL * 2, height - BEVEL * 2, Math.max(radius - BEVEL, 0.005));
  var hole = new THREE.Path();
  traceRoundedRect(hole, -slot.width / 2 - BEVEL, slot.y - slot.height / 2 - BEVEL, slot.width + BEVEL * 2, slot.height + BEVEL * 2, slot.height / 2 + BEVEL);
  outline.holes.push(hole);
  var body = new THREE.ExtrudeGeometry(outline, { depth: THICKNESS, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 5, curveSegments: 24 });
  body.translate(0, 0, -THICKNESS / 2);
  var face = new THREE.ShapeGeometry(outline, 24);
  var position = face.getAttribute('position');
  var uv = face.getAttribute('uv');
  for (var i = 0; i < position.count; i++) uv.setXY(i, (position.getX(i) + width / 2) / width, (position.getY(i) + height / 2) / height);
  uv.needsUpdate = true;
  return { body: body, face: face };
}

function buildClampGeometry(width) {
  var shape = new THREE.Shape();
  var w = width * 1.16;
  traceRoundedRect(shape, -w / 2 + 0.014, -CLAMP_BODY / 2 + 0.014, w - 0.028, CLAMP_BODY - 0.028, 0.024);
  var geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 6, curveSegments: 10 });
  geometry.translate(0, 0, -0.01);
  return geometry;
}

function buildBandGeometry(count) {
  var columns = BAND_COLUMNS.length;
  var geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * columns * 3), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(count * columns * 3), 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * columns * 2), 2));
  var index = [];
  for (var i = 0; i < count - 1; i++) {
    for (var c = 0; c < columns - 1; c++) {
      var a = i * columns + c;
      index.push(a, a + columns, a + 1, a + 1, a + columns, a + columns + 1);
    }
  }
  geometry.setIndex(index);
  return geometry;
}

function buildEnvironment(renderer) {
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0.035, 0.035, 0.04);
  var geometry = new THREE.PlaneGeometry(1, 1);
  var materials = [];
  function panel(intensity, position, scale, rotation) {
    var material = new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity, intensity), side: THREE.DoubleSide });
    materials.push(material);
    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.scale.set(scale[0], scale[1], 1);
    mesh.lookAt(0, 0, 0);
    mesh.rotateZ(rotation || 0);
    scene.add(mesh);
  }
  panel(2.6, [0, 4.5, 8], [9, 4]);
  panel(6, [-5.5, 0.5, 7], [0.9, 14]);
  panel(4, [5, -0.5, 8], [0.6, 14]);
  panel(3.5, [0, -1, 9], [24, 0.35], Math.PI / 3);
  panel(2.5, [1, 2.5, 9], [24, 0.2], Math.PI / 3);
  panel(1.4, [0, 6, -6], [12, 4]);
  panel(0.5, [0, -7, 1], [16, 6]);
  panel(0.9, [8, 0, -2], [4, 10]);
  var pmrem = new THREE.PMREMGenerator(renderer);
  var target = pmrem.fromScene(scene, 0.035);
  pmrem.dispose();
  geometry.dispose();
  materials.forEach(function (m) { m.dispose(); });
  return target;
}

function makeCanvasTexture(canvas, anisotropy) {
  var texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

function buildWeaveTexture() {
  var size = 128, threads = 8;
  var random = seeded(19);
  var fiber = Float32Array.from({ length: size * size }, function () { return random(); });
  function profile(f) { return Math.sqrt(Math.max(0, 1 - 4 * f * f)); }
  function height(x, y) {
    var px = ((x % size) + size) % size, py = ((y % size) + size) % size;
    var u = (px / size) * threads, v = (py / size) * threads;
    var cu = Math.floor(u), cv = Math.floor(v);
    var fu = u - cu - 0.5, fv = v - cv - 0.5;
    var lift = (cu + cv) % 2 === 0;
    var warp = profile(fu) * (0.55 + 0.45 * Math.cos(fv * Math.PI * (lift ? 1 : 0.6)));
    var weft = profile(fv) * (0.55 + 0.45 * Math.cos(fu * Math.PI * (lift ? 0.6 : 1)));
    return (lift ? Math.max(warp, weft * 0.7) : Math.max(weft, warp * 0.7)) + fiber[py * size + px] * 0.08;
  }
  var data = new Uint8Array(size * size * 4);
  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      var nx = (height(x - 1, y) - height(x + 1, y)) * 1.6;
      var ny = (height(x, y - 1) - height(x, y + 1)) * 1.6;
      var length = Math.hypot(nx, ny, 1);
      var i = (y * size + x) * 4;
      data[i] = ((nx / length) * 0.5 + 0.5) * 255;
      data[i + 1] = ((ny / length) * 0.5 + 0.5) * 255;
      data[i + 2] = ((1 / length) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  var texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

// the front of the badge: a green gradient panel the video sits on
function paintFront(canvas) {
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  var w = canvas.width, h = canvas.height;
  var g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#7df2bd');
  g.addColorStop(0.5, '#19c98a');
  g.addColorStop(1, '#06814f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  var glow = ctx.createRadialGradient(w * 0.15, 0, 0, w * 0.15, 0, w * 0.6);
  glow.addColorStop(0, 'rgba(255,255,255,0.35)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  for (var y = 14; y < h; y += 28) for (var x = 14; x < w; x += 28) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 6.3); ctx.fill(); }
}

// the back of the badge: dark panel with the brand mark
function paintBack(canvas, color) {
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  var w = canvas.width, h = canvas.height;
  var g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#0f2a1f');
  g.addColorStop(1, '#06120d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(76, 227, 163, 0.08)';
  for (var y = 14; y < h; y += 28) for (var x = 14; x < w; x += 28) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 6.3); ctx.fill(); }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 ' + Math.round(h * 0.2) + 'px Manrope, Inter, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('GenXflo', w / 2, h * 0.46);
  ctx.font = '500 ' + Math.round(h * 0.06) + 'px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#4ce3a3';
  ctx.fillText('Design, validate and export Nextflow pipelines', w / 2, h * 0.62);
}

function paintStrap(canvas, color) {
  var across = 192, along = across * 2;
  canvas.width = across;
  canvas.height = along;
  var ctx = canvas.getContext('2d');
  if (!ctx) return along / across;
  ctx.fillStyle = toCss(color);
  ctx.fillRect(0, 0, across, along);
  var ink = luminance(color) > 0.5 ? [0, 0, 0] : [1, 1, 1];
  ctx.fillStyle = toCss(ink, 0.05);
  for (var y = 0; y < along; y += 4) ctx.fillRect(0, y, across, 1);
  ctx.fillStyle = toCss(ink, 0.2);
  for (var y2 = 0; y2 < along; y2 += 14) {
    ctx.fillRect(across * 0.075, y2, 2, 8);
    ctx.fillRect(across * 0.925 - 2, y2, 2, 8);
  }
  return along / across;
}

// ---- physics -------------------------------------------------------------------------------------
function createSimulation() {
  function vectors() { return Array.from({ length: JOINTS + 1 }, function () { return new THREE.Vector3(); }); }
  return {
    nodes: vectors(), previous: vectors(), velocities: vectors(),
    lengths: new Float64Array(JOINTS), impulses: new Float64Array(JOINTS), rest: 1,
    anchor: new THREE.Vector3(),
    body: {
      position: new THREE.Vector3(), previous: new THREE.Vector3(), velocity: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(), previousQuaternion: new THREE.Quaternion(), angular: new THREE.Vector3(),
      mass: 1, inverseInertia: new THREE.Vector3(1, 1, 1), hang: new THREE.Vector3()
    },
    grab: null, turn: 0, twist: 0, twistRaw: 0, calm: 0
  };
}

var scratch = {
  a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(),
  e: new THREE.Vector3(), f: new THREE.Vector3(), g: new THREE.Vector3(), pin: new THREE.Vector3(),
  q: new THREE.Quaternion(), r: new THREE.Quaternion()
};

function applyInverseInertia(body, vector, out) {
  scratch.r.copy(body.quaternion).invert();
  out.copy(vector).applyQuaternion(scratch.r);
  out.set(out.x * body.inverseInertia.x, out.y * body.inverseInertia.y, out.z * body.inverseInertia.z);
  return out.applyQuaternion(body.quaternion);
}
function rotateBody(q, w) {
  var qx = q.x, qy = q.y, qz = q.z, qw = q.w;
  q.x += 0.5 * (w.x * qw + w.y * qz - w.z * qy);
  q.y += 0.5 * (w.y * qw + w.z * qx - w.x * qz);
  q.z += 0.5 * (w.z * qw + w.x * qy - w.y * qx);
  q.w += 0.5 * (-w.x * qx - w.y * qy - w.z * qz);
  q.normalize();
}
function bodyWeight(body, r, normal) {
  var rn = scratch.c.crossVectors(r, normal);
  return 1 / body.mass + rn.dot(applyInverseInertia(body, rn, scratch.d));
}
function pushBody(body, r, impulse) {
  body.position.addScaledVector(impulse, 1 / body.mass);
  rotateBody(body.quaternion, applyInverseInertia(body, scratch.e.crossVectors(r, impulse), scratch.f));
}

function solveSegment(sim, i, h, physics) {
  var nodes = sim.nodes, body = sim.body;
  var a = nodes[i];
  var wa = i === 0 ? 0 : NODE_WEIGHT;
  var last = i === JOINTS - 1;
  var r = scratch.g;
  var b = nodes[i + 1];
  if (last) {
    r.copy(body.hang).applyQuaternion(body.quaternion);
    b = scratch.b.copy(body.position).add(r);
  }
  var delta = scratch.a.subVectors(b, a);
  var length = delta.length();
  var stretch = length - sim.rest;
  if (stretch <= 0 || length < 1e-9) return;
  var normal = delta.divideScalar(length);
  var wb = last ? bodyWeight(body, r, normal) : NODE_WEIGHT;
  var rate = (length - sim.lengths[i]) / h;
  var tension = physics.hold * Math.tanh((physics.stiffness * stretch) / physics.hold) + physics.spring * stretch + physics.bandDamping * Math.max(0, rate);
  var room = tension * h * h - sim.impulses[i];
  if (room <= 0) return;
  var lambda = Math.min(stretch / (wa + wb), room);
  sim.impulses[i] += lambda;
  if (wa) a.addScaledVector(normal, lambda * wa);
  if (last) pushBody(body, r, normal.multiplyScalar(-lambda));
  else b.addScaledVector(normal, -lambda * wb);
}

function solvePin(body, grab, target) {
  var r = scratch.g.copy(grab.local).applyQuaternion(body.quaternion);
  var delta = scratch.a.copy(target).sub(body.position).sub(r);
  var distance = delta.length();
  if (distance < 1e-9) return;
  var normal = delta.divideScalar(distance);
  var lambda = distance / bodyWeight(body, r, normal);
  pushBody(body, r, normal.multiplyScalar(lambda));
}

function placeHanging(sim, layout, intro) {
  var nodes = sim.nodes, previous = sim.previous, velocities = sim.velocities, body = sim.body, anchor = sim.anchor;
  nodes[0].copy(anchor);
  for (var i = 1; i <= JOINTS; i++) {
    nodes[i].copy(nodes[i - 1]);
    if (intro) nodes[i].x += sim.rest; else nodes[i].y -= sim.rest;
  }
  body.quaternion.identity();
  if (intro) body.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
  body.hang.set(0, layout.hangY, 0);
  var offset = scratch.a.copy(body.hang).applyQuaternion(body.quaternion);
  body.position.copy(nodes[JOINTS]).sub(offset);
  body.previous.copy(body.position);
  body.previousQuaternion.copy(body.quaternion);
  body.velocity.set(0, 0, 0);
  body.angular.set(0, 0, 0);
  for (var k = 0; k <= JOINTS; k++) { previous[k].copy(nodes[k]); velocities[k].set(0, 0, 0); }
  sim.lengths.fill(sim.rest);
  sim.turn = 0; sim.twist = 0; sim.twistRaw = 0; sim.calm = 0;
}

function configureSimulation(sim, layout, length) {
  sim.rest = length / JOINTS;
  var width = layout.width, height = layout.height;
  var body = sim.body;
  var t = THICKNESS + BEVEL * 2;
  body.mass = 1;
  body.inverseInertia.set(12 / (height * height + t * t), 12 / (width * width + t * t), 12 / (width * width + height * height));
  body.hang.set(0, layout.hangY, 0);
}

function stepSimulation(sim, dt, physics, time) {
  var steps = Math.max(1, Math.ceil(dt / MAX_STEP - 1e-6));
  var h = dt / steps;
  var nodes = sim.nodes, previous = sim.previous, velocities = sim.velocities, body = sim.body;
  var windX = physics.breeze * (Math.sin(time * 0.53) * 0.7 + Math.sin(time * 1.31 + 1.7) * 0.3) * 3;
  var windZ = physics.breeze * Math.sin(time * 0.37 + 0.6) * 2;
  var grab = sim.grab;
  var pin = scratch.pin;
  var nodeDrag = Math.exp(-physics.nodeDrag * h);
  var linearDrag = Math.exp(-physics.linearDrag * h);
  var angularDrag = Math.exp(-physics.angularDrag * h);

  for (var s = 0; s < steps; s++) {
    for (var i = 1; i < JOINTS; i++) {
      var v = velocities[i];
      v.y -= physics.gravity * h; v.x += windX * h; v.z += windZ * h;
      previous[i].copy(nodes[i]);
      nodes[i].addScaledVector(v, h);
    }

    body.previous.copy(body.position);
    body.previousQuaternion.copy(body.quaternion);
    var q = body.quaternion;
    if (grab) {
      var turn = scratch.q.copy(grab.rotation).multiply(scratch.r.copy(q).invert());
      if (turn.w < 0) turn.set(-turn.x, -turn.y, -turn.z, -turn.w);
      var torque = scratch.a.set(turn.x, turn.y, turn.z).multiplyScalar(2 * physics.grip);
      torque.addScaledVector(body.angular, -physics.gripDamping);
      body.angular.addScaledVector(applyInverseInertia(body, torque, scratch.b), h);
    }
    var up = scratch.a.set(0, 1, 0).applyQuaternion(q);
    var front = scratch.b.set(-up.x * up.z, -up.y * up.z, 1 - up.z * up.z);
    if (front.lengthSq() > 1e-3) {
      var facing = scratch.d.set(0, 0, 1).applyQuaternion(q);
      var raw = Math.atan2(scratch.e.crossVectors(front, facing).dot(up), front.dot(facing));
      var turned = raw - sim.twistRaw;
      if (turned > Math.PI) turned -= Math.PI * 2; else if (turned < -Math.PI) turned += Math.PI * 2;
      sim.twist += turned;
      sim.twistRaw = raw;
    }
    if (!grab) {
      var spin = body.angular.dot(up);
      body.angular.addScaledVector(up, (physics.twist * (sim.turn - sim.twist) - physics.twistDamping * spin) * h);
    }
    body.velocity.y -= physics.gravity * h;
    body.velocity.x += windX * 0.35 * h;
    body.velocity.z += windZ * 0.35 * h;
    body.position.addScaledVector(body.velocity, h);
    rotateBody(body.quaternion, scratch.f.copy(body.angular).multiplyScalar(h));

    sim.impulses.fill(0);
    if (grab) pin.lerpVectors(grab.from, grab.target, (s + 1) / steps);
    for (var iteration = 0; iteration < ITERATIONS; iteration++) {
      for (var j = 0; j < JOINTS; j++) solveSegment(sim, j, h, physics);
      if (grab) solvePin(body, grab, pin);
    }

    for (var n = 1; n < JOINTS; n++) {
      var vel = velocities[n].subVectors(nodes[n], previous[n]).divideScalar(h).multiplyScalar(nodeDrag);
      vel.multiplyScalar(1 / (1 + physics.nodeAir * vel.length() * h));
    }
    body.velocity.subVectors(body.position, body.previous).divideScalar(h);
    var dq = scratch.q.copy(body.previousQuaternion).invert().premultiply(body.quaternion);
    body.angular.set(dq.x, dq.y, dq.z).multiplyScalar((2 / h) * (dq.w < 0 ? -1 : 1));

    var normal = scratch.a.set(0, 0, 1).applyQuaternion(body.quaternion);
    var across = body.velocity.dot(normal);
    var along = scratch.b.copy(body.velocity).addScaledVector(normal, -across);
    along.multiplyScalar(1 / (1 + physics.air * along.length() * h));
    body.velocity.copy(along).addScaledVector(normal, across / (1 + physics.broadside * Math.abs(across) * h)).multiplyScalar(linearDrag);
    body.angular.multiplyScalar(angularDrag / (1 + physics.spinAir * body.angular.length() * h));
    if (body.velocity.lengthSq() > 3600) body.velocity.setLength(60);
    if (body.angular.lengthSq() > 1600) body.angular.setLength(40);

    nodes[JOINTS].copy(body.hang).applyQuaternion(body.quaternion).add(body.position);
    for (var m = 0; m < JOINTS; m++) sim.lengths[m] = nodes[m].distanceTo(nodes[m + 1]);
  }

  if (grab) grab.from.copy(grab.target);

  var energy = body.velocity.lengthSq() + body.angular.lengthSq() * 0.3;
  for (var e = 1; e < JOINTS; e++) energy += velocities[e].lengthSq() * 0.05;
  sim.calm = energy < 2e-4 ? sim.calm + dt : 0;
}

// ---- mount ----------------------------------------------------------------------------------------
function mount(container, opts) {
  var o = Object.assign({
    box: null, video: null, cardColor: '#ffffff', cornerRadius: 0.05, strapColor: '#0d1a14', strapWidth: 0.9, strapLength: 0.46,
    gravity: 1, damping: 0.7, elasticity: 0.5, breeze: 0.4, interactive: true, intro: true, fill: 0.9
  }, opts || {});
  var low = !!window.GX_LOW;

  var renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: !low, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return null; }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  var canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  var anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  var scene = new THREE.Scene();
  var environment = buildEnvironment(renderer);
  scene.environment = environment.texture;
  var camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  var keyLight = new THREE.DirectionalLight(0xffffff, 1.6); keyLight.position.set(-2.5, 4, 6);
  var fillLight = new THREE.DirectionalLight(0xffffff, 0.35); fillLight.position.set(3, -1, 4);
  scene.add(keyLight, fillLight);

  var layout = cardLayout(o.cornerRadius);

  // textures: the front is the live video, the back and strap are painted
  var videoTexture = null;
  if (o.video) {
    videoTexture = new THREE.VideoTexture(o.video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.generateMipmaps = false;
  }
  var frontCanvas = document.createElement('canvas');
  frontCanvas.width = FACE_WIDTH;
  frontCanvas.height = Math.round(FACE_WIDTH * layout.height / layout.width);
  paintFront(frontCanvas);
  var frontTexture = makeCanvasTexture(frontCanvas, anisotropy);
  var backCanvas = document.createElement('canvas');
  backCanvas.width = FACE_WIDTH;
  backCanvas.height = Math.round(FACE_WIDTH * layout.height / layout.width);
  paintBack(backCanvas, parseColor(o.cardColor, [1, 1, 1]));
  var backTexture = makeCanvasTexture(backCanvas, anisotropy);
  var strapCanvas = document.createElement('canvas');
  var tileRatio = paintStrap(strapCanvas, parseColor(o.strapColor, [0.05, 0.1, 0.08]));
  var strapTexture = makeCanvasTexture(strapCanvas, anisotropy);
  strapTexture.wrapS = THREE.ClampToEdgeWrapping;
  strapTexture.wrapT = THREE.RepeatWrapping;
  var weave = buildWeaveTexture();
  weave.repeat.set(2, 2 * tileRatio);

  var card = parseColor(o.cardColor, [1, 1, 1]);
  var frontMaterial = new THREE.MeshPhysicalMaterial({
    map: frontTexture, roughness: FINISH.roughness, metalness: FINISH.metalness,
    clearcoat: FINISH.clearcoat, clearcoatRoughness: FINISH.clearcoatRoughness
  });
  // the video is unlit, so reflections never wash over the product UI
  var videoMaterial = new THREE.MeshBasicMaterial({ map: videoTexture, toneMapped: false });
  var backMaterial = new THREE.MeshPhysicalMaterial({
    map: backTexture, roughness: FINISH.roughness, metalness: FINISH.metalness,
    clearcoat: FINISH.clearcoat, clearcoatRoughness: FINISH.clearcoatRoughness
  });
  var edgeMaterial = new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
  edgeMaterial.color.setRGB(card[0] * 0.92, card[1] * 0.92, card[2] * 0.92, THREE.SRGBColorSpace);
  var metalMaterial = new THREE.MeshStandardMaterial({ metalness: 1, color: METAL.color, roughness: METAL.roughness });
  var bandMaterial = new THREE.MeshPhysicalMaterial({
    map: strapTexture, normalMap: weave, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.68,
    sheen: 1, sheenRoughness: 0.42, sheenColor: new THREE.Color(0.32, 0.32, 0.34), side: THREE.DoubleSide
  });

  var cardGroup = new THREE.Group();
  var geometry = buildCardGeometry(layout);
  var bodyMesh = new THREE.Mesh(geometry.body, edgeMaterial);
  var frontMesh = new THREE.Mesh(geometry.face, frontMaterial);
  var backMesh = new THREE.Mesh(geometry.face.clone(), backMaterial);
  frontMesh.position.z = THICKNESS / 2 + BEVEL + 0.0006;
  backMesh.rotation.y = Math.PI;
  backMesh.position.z = -(THICKNESS / 2 + BEVEL + 0.0006);
  var videoShape = new THREE.Shape();
  traceRoundedRect(videoShape, -VIDEO_W / 2, -VIDEO_H / 2, VIDEO_W, VIDEO_H, 0.035);
  var videoGeometry = new THREE.ShapeGeometry(videoShape, 12);
  var vpos = videoGeometry.getAttribute('position'), vuv = videoGeometry.getAttribute('uv');
  for (var vi = 0; vi < vpos.count; vi++) vuv.setXY(vi, (vpos.getX(vi) + VIDEO_W / 2) / VIDEO_W, (vpos.getY(vi) + VIDEO_H / 2) / VIDEO_H);
  var videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);
  videoMesh.position.set(0, layout.height / 2 - TOP_ZONE - VIDEO_H / 2, THICKNESS / 2 + BEVEL + 0.0016);
  var ring = new THREE.Mesh(new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, 18, 72), metalMaterial);
  ring.rotation.y = Math.PI / 2 - 0.7;
  ring.position.set(0, layout.ringY, 0);
  cardGroup.add(bodyMesh, frontMesh, videoMesh, backMesh, ring);
  scene.add(cardGroup);

  var bandGeometry = buildBandGeometry(SAMPLES);
  var band = new THREE.Mesh(bandGeometry, bandMaterial);
  band.frustumCulled = false;
  scene.add(band);

  var strapScale = STRAP_WIDTH * clamp(o.strapWidth, 0.4, 2);
  var clampGroup = new THREE.Group();
  var clampMesh = new THREE.Mesh(buildClampGeometry(strapScale), metalMaterial);
  clampMesh.position.y = EYELET_RADIUS + CLAMP_BODY / 2 - 0.004;
  var eyelet = new THREE.Mesh(new THREE.TorusGeometry(EYELET_RADIUS, 0.0105, 14, 40), metalMaterial);
  clampGroup.add(clampMesh, eyelet);
  scene.add(clampGroup);

  var sim = createSimulation();
  var controls = [];
  var mouth = new THREE.Vector3(), tuck = new THREE.Vector3();
  var curve = new THREE.CatmullRomCurve3(controls, false, 'centripetal');
  var view = { width: 1, height: 1 };
  var lastW = 0, lastH = 0;
  var raf = 0, last = performance.now(), time = 0, visible = true, alive = true, placed = false, hovering = false, press = null;
  var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function frameView() {
    var aspect = view.width / view.height;
    // the canvas can be larger than the box the badge belongs to, so nothing is clipped while it swings:
    // the card spans o.fill of the box width, and everything is measured from the box
    var hr = container.getBoundingClientRect();
    var br = (o.box || container).getBoundingClientRect();
    var boxW = Math.max(1, br.width), boxH = Math.max(1, br.height);
    var upp = layout.width / (o.fill * boxW);              // world units per pixel
    var viewWidth = view.width * upp;
    var viewHeight = view.height * upp;
    var boxCx = ((br.left + br.width / 2) - (hr.left + hr.width / 2)) * upp;
    var topY = ((hr.top + hr.height / 2) - br.top) * upp;  // world y of the top edge of the box
    camera.aspect = aspect;
    camera.position.set(0, 0, viewHeight / 2 / Math.tan((FOV * Math.PI) / 360));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    var anchorY = topY + 0.2;
    var cardTop = topY - boxH * upp * mix(0.12, 0.42, clamp(o.strapLength, 0, 1));
    var hangTop = cardTop + (layout.hangY - layout.height / 2);
    sim.anchor.set(boxCx, anchorY, 0);
    configureSimulation(sim, layout, anchorY - hangTop);
    sim.nodes[0].copy(sim.anchor);
    sim.previous[0].copy(sim.anchor);
  }

  var points = Array.from({ length: SAMPLES }, function () { return new THREE.Vector3(); });
  var sides = Array.from({ length: SAMPLES }, function () { return new THREE.Vector3(); });
  var bends = BAND_BEND.map(function (angle) { return [Math.cos(angle), Math.sin(angle)]; });
  var work = { tangent: new THREE.Vector3(), toCamera: new THREE.Vector3(), basis: new THREE.Matrix4(), up: new THREE.Vector3(), across: new THREE.Vector3(), facing: new THREE.Vector3(), end: new THREE.Vector3() };

  function updateBand() {
    var hang = sim.nodes[JOINTS];
    var reach = EYELET_RADIUS + CLAMP_BODY + 0.05;
    var guide = JOINTS - 1;
    while (guide > 0 && sim.nodes[guide].distanceTo(hang) < reach * 1.1) guide--;
    var axis = work.up.subVectors(sim.nodes[guide], hang);
    if (axis.lengthSq() < 1e-8) axis.set(0, 1, 0).applyQuaternion(sim.body.quaternion);
    axis.normalize();
    mouth.copy(hang).addScaledVector(axis, reach);
    tuck.copy(hang).addScaledVector(axis, EYELET_RADIUS + CLAMP_BODY * 0.35);
    controls.length = 0;
    for (var i = 0; i <= guide; i++) controls.push(sim.nodes[i]);
    controls.push(mouth, tuck);
    curve.updateArcLengths();
    for (var s = 0; s < SAMPLES; s++) curve.getPointAt(s / (SAMPLES - 1), points[s]);
    var length = curve.getLength();
    var held = 1 - mouth.distanceTo(tuck) / Math.max(length, 0.001);
    var position = bandGeometry.getAttribute('position');
    var normal = bandGeometry.getAttribute('normal');
    var uv = bandGeometry.getAttribute('uv');
    var columns = BAND_COLUMNS.length;
    var restLength = sim.rest * JOINTS;
    var repeats = restLength / (strapScale * tileRatio);
    var width = strapScale / Math.pow(Math.max(1, length / Math.max(restLength, 0.001)), 0.35);
    var tangent = work.tangent, toCamera = work.toCamera, across = work.across, facing = work.facing;
    for (var k = 0; k < SAMPLES; k++) {
      tangent.subVectors(points[Math.min(SAMPLES - 1, k + 1)], points[Math.max(0, k - 1)]);
      if (tangent.lengthSq() < 1e-12) tangent.set(0, -1, 0);
      tangent.normalize();
      toCamera.subVectors(camera.position, points[k]).normalize();
      var side = sides[k].crossVectors(toCamera, tangent);
      if (side.lengthSq() < 1e-10) side.copy(k > 0 ? sides[k - 1] : scratch.a.set(1, 0, 0));
      side.normalize();
      if (k > 0 && side.dot(sides[k - 1]) < 0) side.negate();
      var angle = -sim.twist * Math.pow(Math.min(1, k / (SAMPLES - 1) / held), 1.3);
      facing.crossVectors(tangent, side);
      across.copy(side).multiplyScalar(Math.cos(angle)).addScaledVector(facing, Math.sin(angle));
      facing.crossVectors(tangent, across);
      var p = points[k];
      var v = (1 - k / (SAMPLES - 1)) * repeats;
      for (var c = 0; c < columns; c++) {
        var idx = k * columns + c;
        var offset = (BAND_COLUMNS[c] - 0.5) * width;
        var bendCos = bends[c][0], bendSin = bends[c][1];
        position.setXYZ(idx, p.x + across.x * offset, p.y + across.y * offset, p.z + across.z * offset);
        normal.setXYZ(idx, facing.x * bendCos + across.x * bendSin, facing.y * bendCos + across.y * bendSin, facing.z * bendCos + across.z * bendSin);
        uv.setXY(idx, BAND_COLUMNS[c], v);
      }
    }
    work.end.copy(across);
    position.needsUpdate = true; normal.needsUpdate = true; uv.needsUpdate = true;

    across.copy(work.end).addScaledVector(axis, -work.end.dot(axis)).normalize();
    facing.crossVectors(across, axis).normalize();
    work.basis.makeBasis(across, axis, facing);
    clampGroup.quaternion.setFromRotationMatrix(work.basis);
    clampGroup.position.copy(hang);
  }

  function render() {
    cardGroup.position.copy(sim.body.position);
    cardGroup.quaternion.copy(sim.body.quaternion);
    updateBand();
    renderer.render(scene, camera);
  }

  function physics() {
    var gravity = 40 * clamp(o.gravity, 0, 3);
    var weight = Math.max(gravity, 20);
    var springy = clamp(o.elasticity, 0, 1);
    var settle = clamp(o.damping, 0, 1);
    return {
      gravity: gravity, hold: weight * mix(2.2, 5.5, springy), stiffness: weight * 10 * JOINTS,
      spring: weight * mix(0.1, 0.4, springy) * JOINTS, bandDamping: weight * mix(0.3, 0.08, springy) * JOINTS,
      linearDrag: 0.25 * Math.pow(16, settle), angularDrag: 0.5 * Math.pow(12, settle),
      air: 0.15, broadside: 0.5, spinAir: 0.03, nodeDrag: 2, nodeAir: 0.2, twist: 30, twistDamping: 3,
      grip: 40, gripDamping: 6, breeze: reducedMotion ? 0 : clamp(o.breeze, 0, 1)
    };
  }

  var minGap = low ? 1000 / 40 : 0;
  function tick(now) {
    raf = 0;
    if (!alive) return;
    if (visible && !document.hidden) raf = requestAnimationFrame(tick); // always draw: the video is live
    if (minGap && now - last < minGap) return;
    var dt = Math.min(1 / 30, Math.max(1 / 240, (now - last) / 1000));
    last = now;
    time += dt;
    stepSimulation(sim, dt, physics(), time);
    var b = sim.body;
    if (!Number.isFinite(b.position.x + b.position.y + b.position.z + b.quaternion.w)) { sim.grab = null; placeHanging(sim, layout, false); }
    render();
  }
  function start() {
    if (raf || !visible || !alive) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  // ---- pointer: drag to swing, click to flip -----------------------------------------------------
  var raycaster = new THREE.Raycaster();
  var pointer = new THREE.Vector2();
  function toPointer(event) {
    var rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  }
  function pickCard() {
    cardGroup.updateMatrixWorld();
    var hits = raycaster.intersectObjects([bodyMesh, frontMesh, videoMesh, backMesh], false);
    return hits[0] || null;
  }
  function setCursor(value) { if (canvas.style.cursor !== value) canvas.style.cursor = value; }
  function flip(point) {
    var body = sim.body;
    var up = scratch.a.set(0, 1, 0).applyQuaternion(body.quaternion);
    var direction = sim.turn > 0 ? -1 : 1;
    if (sim.turn === 0) {
      var away = scratch.c.subVectors(point, camera.position).normalize();
      direction = scratch.b.subVectors(point, body.position).cross(away).dot(up) < 0 ? -1 : 1;
    }
    sim.turn = sim.turn === 0 ? Math.PI * direction : 0;
    body.angular.addScaledVector(up, FLIP_SPIN * direction);
  }
  function onPointerDown(event) {
    if (!o.interactive || event.button > 0) return;
    toPointer(event);
    var hit = pickCard();
    if (!hit) return;
    sim.grab = {
      local: hit.point.clone().sub(sim.body.position).applyQuaternion(sim.body.quaternion.clone().invert()),
      rotation: sim.body.quaternion.clone(), reach: hit.distance, from: hit.point.clone(), target: hit.point.clone()
    };
    press = { x: event.clientX, y: event.clientY, time: performance.now(), point: hit.point.clone() };
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
    setCursor('grabbing');
    event.preventDefault();
    start();
  }
  function onPointerMove(event) {
    if (!o.interactive) return;
    toPointer(event);
    if (sim.grab) {
      if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6) press = null;
      raycaster.ray.at(sim.grab.reach, sim.grab.target);
      start();
      return;
    }
    if (event.pointerType === 'touch') return;
    hovering = !!pickCard();
    setCursor(hovering ? 'grab' : '');
  }
  function onPointerUp(event) {
    if (!sim.grab) return;
    sim.grab = null;
    if (press && event.type === 'pointerup' && performance.now() - press.time < 450) flip(press.point);
    press = null;
    if (canvas.releasePointerCapture) { try { canvas.releasePointerCapture(event.pointerId); } catch (e) {} }
    setCursor(hovering && event.pointerType !== 'touch' ? 'grab' : '');
    start();
  }
  function onTouchStart(event) {
    if (!o.interactive || event.touches.length !== 1) return;
    toPointer(event.touches[0]);
    if (pickCard()) event.preventDefault();
  }
  // the canvas overhangs its box, so it only catches the pointer while the pointer is over the card
  if (o.box) {
    canvas.style.pointerEvents = 'none';
    window.addEventListener('pointermove', function (e) {
      if (!o.interactive || sim.grab || e.pointerType === 'touch') return;
      toPointer(e);
      var over = !!pickCard();
      hovering = over;
      canvas.style.pointerEvents = over ? 'auto' : 'none';
      setCursor(over ? 'grab' : '');
    }, { passive: true });
  }
  canvas.style.touchAction = o.interactive ? 'pan-y' : 'auto';
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('lostpointercapture', onPointerUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });

  function resize() {
    view.width = Math.max(1, container.clientWidth);
    view.height = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 1.75));
    renderer.setSize(view.width, view.height, false);
    var resized = placed && (Math.abs(view.height - lastH) > 2 || Math.abs(view.width - lastW) > 2);
    lastW = view.width; lastH = view.height;
    frameView();
    if (!placed) { placeHanging(sim, layout, o.intro && !reducedMotion); placed = true; }
    else if (resized && !sim.grab) placeHanging(sim, layout, false);
    render();
  }
  var ro = new ResizeObserver(resize);
  ro.observe(container);
  var io = new IntersectionObserver(function (entries) {
    visible = entries.some(function (e) { return e.isIntersecting; });
    if (visible) start();
  });
  io.observe(container);
  function onVis() { if (!document.hidden) start(); }
  document.addEventListener('visibilitychange', onVis);

  resize();
  start();
  container.setAttribute('data-lanyard-ready', '');

  return {
    destroy: function () {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
  };
}

window.Lanyard = mount;

[].forEach.call(document.querySelectorAll('[data-lanyard]'), function (host) {
  if (window.matchMedia && window.matchMedia('(max-width: 820px)').matches) return;
  var video = document.getElementById(host.getAttribute('data-video') || '');
  if (!video) return;
  var box = host.closest('.hero-v1__box');
  box.classList.add('has-lanyard'); // size the box first so the strap is measured against its final height
  var api = mount(host, { video: video, box: box });
  if (!api) box.classList.remove('has-lanyard');
});
