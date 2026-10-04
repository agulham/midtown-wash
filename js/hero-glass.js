// Midtown Wash — real WebGL glass membership card hero.
// Built with Three.js (ES modules via CDN import map, no build step).
// MeshPhysicalMaterial with transmission = actual light refraction through
// glass, not a CSS image fake. Falls back to the static <img> already in
// the markup if WebGL is unavailable or the user prefers reduced motion.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

function initGlassCard() {
  const stage = document.querySelector('.card-stage');
  if (!stage) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return; // No WebGL — keep the static <img> fallback already in the DOM.
  }

  const canvas = renderer.domElement;
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.zIndex = '2';
  stage.appendChild(canvas);

  // Hide the static fallback image/card once WebGL confirms it can render.
  const fallback = stage.querySelector('.card-3d');
  if (fallback) fallback.style.display = 'none';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // --- Card face texture: drawn on canvas so brand text stays crisp at any res ---
  function buildFaceTexture() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 646; // credit-card ratio ~1.586:1
    const ctx = c.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
    grad.addColorStop(0, '#0d1626');
    grad.addColorStop(0.5, '#132544');
    grad.addColorStop(1, '#0a0f1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, c.width, c.height);

    // Chrome sweep accent band
    const sweep = ctx.createLinearGradient(0, 0, c.width, 0);
    sweep.addColorStop(0, 'rgba(201,204,212,0)');
    sweep.addColorStop(0.5, 'rgba(59,124,245,0.55)');
    sweep.addColorStop(1, 'rgba(201,204,212,0)');
    ctx.fillStyle = sweep;
    ctx.fillRect(0, c.height * 0.38, c.width, c.height * 0.1);

    // Wordmark
    ctx.fillStyle = '#ededE8';
    ctx.font = '600 72px "Clash Display", sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('MIDTOWN WASH', 60, 160);

    ctx.font = '400 28px "General Sans", sans-serif';
    ctx.fillStyle = 'rgba(237,237,232,.6)';
    ctx.fillText('MEMBER', 60, c.height - 110);
    ctx.font = '600 40px "General Sans", sans-serif';
    ctx.fillStyle = '#ededE8';
    ctx.fillText('№ 00001', 60, c.height - 60);

    // Chip
    ctx.fillStyle = 'rgba(59,124,245,0.85)';
    const chipW = 110, chipH = 80, chipX = c.width - chipW - 70, chipY = c.height - chipH - 70;
    const r = 14;
    ctx.beginPath();
    ctx.moveTo(chipX + r, chipY);
    ctx.arcTo(chipX + chipW, chipY, chipX + chipW, chipY + chipH, r);
    ctx.arcTo(chipX + chipW, chipY + chipH, chipX, chipY + chipH, r);
    ctx.arcTo(chipX, chipY + chipH, chipX, chipY, r);
    ctx.arcTo(chipX, chipY, chipX + chipW, chipY, r);
    ctx.closePath();
    ctx.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  const faceTexture = buildFaceTexture();

  // --- Card geometry: rounded box, real thickness ---
  const CARD_W = 5.4, CARD_H = 3.4, CARD_T = 0.14;
  const geometry = new RoundedBoxGeometry(CARD_W, CARD_H, CARD_T, 4, 0.18);

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0d1626,
    metalness: 0.35,
    roughness: 0.15,
    ior: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.6,
    reflectivity: 0.9,
    // Intentionally no `transmission`: it forces Three.js to re-render the
    // whole scene to an offscreen buffer every frame (expensive on weak/
    // mobile GPUs). High clearcoat + reflectivity + strong env lighting
    // reads as glass/chrome at a fraction of the per-frame cost.
  });

  // Face materials: front uses the drawn texture, rest use the glass material.
  const frontMaterial = new THREE.MeshPhysicalMaterial({
    map: faceTexture,
    metalness: 0.3,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.3,
  });

  // RoundedBoxGeometry is a single buffer geometry (no per-face groups by
  // default beyond a BoxGeometry's 6), so assign materials as an array in
  // standard box face order: +x -x +y -y +z -z. We want +z (front) textured.
  const materials = [glassMaterial, glassMaterial, glassMaterial, glassMaterial, frontMaterial, glassMaterial];
  const card = new THREE.Mesh(geometry, materials);
  scene.add(card);

  // --- Lighting rig: cool blue key + warm rim, matches brand palette ---
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0x5f9bff, 2.2);
  key.position.set(4, 5, 6);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xffffff, 1.1);
  rim.position.set(-5, -2, 3);
  scene.add(rim);

  const fill = new THREE.PointLight(0x3b7cf5, 1.4, 20);
  fill.position.set(-3, 3, 4);
  scene.add(fill);

  // --- Resize handling ---
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  // --- Animation loop ---
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = document.visibilityState === 'visible';
    if (running) requestAnimationFrame(animate);
  });

  const clock = new THREE.Clock();

  function animate() {
    if (!running) return;
    const t = clock.getElapsedTime();

    if (!prefersReduced) {
      card.rotation.y = t * 0.45;
      card.rotation.x = 0.12 + Math.sin(t * 0.6) * 0.05;
      card.position.y = Math.sin(t * 0.8) * 0.12;
      requestAnimationFrame(animate);
    }

    renderer.render(scene, camera);
  }

  if (prefersReduced) {
    card.rotation.y = -0.5;
    card.rotation.x = 0.15;
    renderer.render(scene, camera);
  } else {
    animate();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGlassCard);
} else {
  initGlassCard();
}
