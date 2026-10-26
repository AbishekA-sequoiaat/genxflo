/*
 * dna.js — vanilla JS (ES module) port of the React Three Fiber "DNA in a glass capsule" scene
 * (Scene.jsx, Dna.jsx, CameraRig.jsx, Particles.jsx).
 *   <div data-dna data-src="dna_vr_interactive_animation.glb"></div>
 * A transmissive iridescent capsule stands at a fixed slant; a spinning DNA helix sits inside it
 * and soft bokeh particles drift behind. If the .glb is missing a procedural helix is used instead.
 * Needs an import map that maps "three" to vendor/three/three.module.min.js.
 */
import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/GLTFLoader.js';
import { RoomEnvironment } from './vendor/three/environments/RoomEnvironment.js';

var STRAND = '#19d28c';
var STRAND_B = '#4ce3a3';
var TILT = [-0.12, 0, -0.62];   // the capsule stands slanted, like a pill propped up (no floating)

function helix(height) {
  var group = new THREE.Group();
  var turns = 1, steps = 22, radius = height * 0.14;
  var matA = new THREE.MeshPhysicalMaterial({ color: STRAND, metalness: 0.2, roughness: 0.1 });
  var matB = new THREE.MeshPhysicalMaterial({ color: STRAND_B, metalness: 0.2, roughness: 0.1 });
  var rung = new THREE.MeshPhysicalMaterial({ color: '#d9fbe9', metalness: 0, roughness: 0.25 });
  var ball = new THREE.SphereGeometry(height * 0.036, 20, 16);
  var bar = new THREE.CylinderGeometry(height * 0.01, height * 0.01, 1, 8);
  var up = new THREE.Vector3(0, 1, 0);
  for (var i = 0; i <= steps; i++) {
    var t = i / steps, a = t * turns * Math.PI * 2, y = (t - 0.5) * height;
    var p1 = new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius);
    var p2 = new THREE.Vector3(Math.cos(a + Math.PI) * radius, y, Math.sin(a + Math.PI) * radius);
    var s1 = new THREE.Mesh(ball, matA); s1.position.copy(p1); group.add(s1);
    var s2 = new THREE.Mesh(ball, matB); s2.position.copy(p2); group.add(s2);
    if (i % 2 === 0) {
      var r = new THREE.Mesh(bar, rung);
      r.position.copy(p1).add(p2).multiplyScalar(0.5);
      r.scale.y = p1.distanceTo(p2);
      r.quaternion.setFromUnitVectors(up, p2.clone().sub(p1).normalize());
      group.add(r);
    }
  }
  return group;
}

// soft white-ish discs drifting around behind the capsule (Particles.jsx)
function particles(count, color) {
  var pos = new Float32Array(count * 3), seed = new Float32Array(count * 3), speed = new Float32Array(count);
  for (var i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 10.5;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 10.5;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 10.5 - 2;
    seed[i * 3] = Math.random() * 6.28; seed[i * 3 + 1] = Math.random() * 6.28; seed[i * 3 + 2] = Math.random() * 6.28;
    speed[i] = 0.25 + Math.random() * 0.75;
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  var mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { size: { value: 16 }, scale: { value: 40 }, color: { value: new THREE.Color(color) } },
    vertexShader: THREE.ShaderLib.points.vertexShader,
    fragmentShader: 'uniform vec3 color; void main(){ float l = length(gl_PointCoord - vec2(0.5)); gl_FragColor = vec4(color, step(l, 0.5) * 0.35); }'
  });
  var points = new THREE.Points(geo, mat);
  var base = pos.slice();
  points.userData.tick = function (t) {
    var p = geo.attributes.position.array;
    for (var i = 0; i < count; i++) {
      var k = i * 3, s = speed[i];
      p[k] = base[k] + Math.sin(t * 0.2 * s + seed[k]) * 0.9;
      p[k + 1] = base[k + 1] + Math.sin(t * 0.17 * s + seed[k + 1]) * 0.9;
      p[k + 2] = base[k + 2] + Math.sin(t * 0.13 * s + seed[k + 2]) * 0.9;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return points;
}

function mount(host) {
  var src = host.getAttribute('data-src');
  var low = !!window.GX_LOW;
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !low, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 1.25));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
  host.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 1.1;

  var camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(0, 0.2, 5.3);
  var target = new THREE.Vector3(0, -0.2, 0);
  camera.lookAt(target);


  var rig = new THREE.Group();     // follows the pointer (CameraRig.jsx)
  var floaty = new THREE.Group();  // drifts and tilts (drei <Float>)
  var tilt = new THREE.Group();    // resting tilt
  tilt.rotation.set(TILT[0], TILT[1], TILT[2]);
  scene.add(rig); rig.add(floaty); floaty.add(tilt);

  var capsule = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.9, 2.5, 4, low ? 20 : 32),
    new THREE.MeshPhysicalMaterial({
      color: '#a6f3cf', transmission: 1, thickness: 0.95, ior: 1.3, roughness: 0.05,
      clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 1, iridescenceIOR: 1.55,
      iridescenceThicknessRange: [100, 600], metalness: 0, attenuationColor: new THREE.Color('#5fdca6'), attenuationDistance: 1.6
    })
  );
  tilt.add(capsule);

  var spin = new THREE.Group();    // the DNA turning on its own axis (Dna.jsx group.rotation.y)
  tilt.add(spin);

  function place(object) {
    var box = new THREE.Box3().setFromObject(object);
    var size = box.getSize(new THREE.Vector3());
    object.position.sub(box.getCenter(new THREE.Vector3()));
    var wrap = new THREE.Group();
    wrap.add(object);
    wrap.scale.setScalar(3.5 / size.y);   // the helix runs along the capsule's long axis
    spin.add(wrap);
  }

  function useFallback() { place(helix(3.5)); host.setAttribute('data-dna-ready', 'fallback'); }

  if (src) {
    new GLTFLoader().load(src, function (gltf) {
      gltf.scene.traverse(function (n) {
        if (n.isMesh) n.material = new THREE.MeshPhysicalMaterial({ color: STRAND, metalness: 0.2, roughness: 0.1 });
      });
      place(gltf.scene);
      host.setAttribute('data-dna-ready', 'model');
    }, undefined, useFallback);
  } else useFallback();

  var pointer = { x: 0, y: 0 };
  window.addEventListener('pointermove', function (e) {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });

  function resize() {
    var w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(host);
  else window.addEventListener('resize', resize);

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var visible = true, raf = 0, last = 0, time = 0;
  var gap = low ? 1000 / 30 : 0;
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    raf = requestAnimationFrame(frame);
    if (gap && now - last < gap) return;
    var dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    if (!reduce) {
      time += dt;
      spin.rotation.y += dt * 0.9;
    }
    renderer.render(scene, camera);
  }
  new IntersectionObserver(function (entries) {
    visible = entries.some(function (e) { return e.isIntersecting; });
    if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  }).observe(host);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && visible && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  });
  raf = requestAnimationFrame(frame);
}

[].forEach.call(document.querySelectorAll('[data-dna]'), function (host) {
  if (window.matchMedia && window.matchMedia('(max-width: 820px)').matches) return;
  mount(host);
});
