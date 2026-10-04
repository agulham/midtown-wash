// Midtown Wash — hero car-wash loop. Low-poly, stylized, procedural Three.js.
// No external 3D assets: car body/wheels/foam are built from primitives so
// this costs zero asset-generation credits and stays lightweight.
//
// Sequence (loops every ~14s):
//   0.0s  dirty car drives in from off-screen left
//   2.0s  car stops in wash bay, foam sprays on
//   4.5s  two "scrubber" blobs move across the car (simple stand-in geometry)
//   7.5s  foam fades, car "rinses" clean (material brightens/desaturates dirt tint)
//   9.5s  clean car drives off-screen right
//  10.5s  a NEW car (different color) drives in from left, same cycle repeats

import * as THREE from 'three';

function initCarWash() {
  const stage = document.querySelector('.carwash-stage');
  if (!stage) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return; // leaves the static fallback image in the DOM
  }

  const canvas = renderer.domElement;
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.zIndex = '2';
  stage.appendChild(canvas);

  const fallback = stage.querySelector('.carwash-fallback');
  if (fallback) fallback.style.display = 'none';

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-8, 8, 4.5, -4.5, 0.1, 100);
  camera.position.set(6, 4, 7);
  camera.lookAt(0, 0.3, 0);

  // --- Lighting ---
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xbfd4ff, 1.4);
  key.position.set(5, 8, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x3b7cf5, 0.8);
  rim.position.set(-4, 3, -3);
  scene.add(rim);

  // --- Ground / wash-bay floor ---
  const floorGeo = new THREE.PlaneGeometry(40, 20);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.6, metalness: 0.1 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.52;
  scene.add(floor);

  // Faint blue bay guideline
  const lineGeo = new THREE.PlaneGeometry(0.08, 6);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x3b7cf5, transparent: true, opacity: 0.35 });
  for (const x of [-1.6, 1.6]) {
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, -0.515, 0);
    scene.add(line);
  }

  // --- Low-poly car builder ---
  function buildCar(color) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.45 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0d0f13, roughness: 0.5, metalness: 0.2 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a2a40, roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.85 });

    // Lower body
    const lower = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 1.5), bodyMat);
    lower.position.y = 0.0;
    group.add(lower);

    // Cabin (trapezoid-ish via scaled box)
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 1.35), glassMat);
    cabin.position.set(-0.15, 0.52, 0);
    group.add(cabin);

    // Roof sliver
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 1.3), bodyMat);
    roof.position.set(-0.15, 0.8, 0);
    group.add(roof);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 12);
    const wheelPositions = [
      [-1.15, -0.32, 0.78], [-1.15, -0.32, -0.78],
      [1.15, -0.32, 0.78], [1.15, -0.32, -0.78],
    ];
    group.userData.wheels = [];
    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      group.add(wheel);
      group.userData.wheels.push(wheel);
    });

    group.userData.bodyMat = bodyMat;
    group.userData.baseColor = new THREE.Color(color);
    return group;
  }

  // --- Foam particle system (simple instanced spheres) ---
  const FOAM_COUNT = 70;
  const foamGeo = new THREE.SphereGeometry(0.1, 6, 6);
  const foamMat = new THREE.MeshStandardMaterial({ color: 0xf5f7fb, roughness: 0.9, transparent: true, opacity: 0 });
  const foam = new THREE.InstancedMesh(foamGeo, foamMat, FOAM_COUNT);
  const foamSeeds = [];
  for (let i = 0; i < FOAM_COUNT; i++) {
    foamSeeds.push({
      x: (Math.random() - 0.5) * 3.2,
      y: Math.random() * 0.9 - 0.1,
      z: (Math.random() - 0.5) * 1.6,
      scale: 0.5 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
    });
  }
  scene.add(foam);

  // --- Scrubber stand-ins (two simple capsule blobs that sweep the car) ---
  function buildScrubber() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x3b7cf5, roughness: 0.4, metalness: 0.3 });
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.6, 4, 8), mat);
    mesh.rotation.z = Math.PI / 2;
    return mesh;
  }
  const scrubberA = buildScrubber();
  const scrubberB = buildScrubber();
  scrubberA.visible = false;
  scrubberB.visible = false;
  scene.add(scrubberA, scrubberB);

  // --- Car palette: two alternating colors, swapped each cycle ---
  const PALETTE = [0x0d1626, 0x3b5a8a]; // deep navy, steel blue — stays on-brand
  let carIndex = 0;
  let car = buildCar(PALETTE[carIndex]);
  scene.add(car);

  function swapCar() {
    scene.remove(car);
    carIndex = (carIndex + 1) % PALETTE.length;
    car = buildCar(PALETTE[carIndex]);
    scene.add(car);
  }

  // --- Resize ---
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    const aspect = w / h;
    const viewSize = 4.5;
    camera.left = -viewSize * aspect;
    camera.right = viewSize * aspect;
    camera.top = viewSize;
    camera.bottom = -viewSize;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // --- Animation timeline (seconds), loops every CYCLE ---
  const CYCLE = 14;
  const DRIVE_IN_END = 2.2;
  const WASH_START = 2.2;
  const FOAM_PEAK = 4.0;
  const SCRUB_START = 4.5;
  const SCRUB_END = 7.0;
  const RINSE_END = 9.0;
  const DRIVE_OUT_START = 9.0;
  const DRIVE_OUT_END = 11.2;
  const PAUSE_END = 12.2; // empty bay beat before next car

  const ENTRY_X = -11, BAY_X = 0, EXIT_X = 11;

  function ease(t) { return t * t * (3 - 2 * t); } // smoothstep

  let lastCycleIndex = -1;

  function render(t) {
    const cycleTime = t % CYCLE;
    const cycleIndex = Math.floor(t / CYCLE);
    if (cycleIndex !== lastCycleIndex) {
      if (lastCycleIndex >= 0) swapCar();
      lastCycleIndex = cycleIndex;
    }

    // --- Car position ---
    let carX, wheelSpin = 0;
    if (cycleTime < DRIVE_IN_END) {
      const p = ease(cycleTime / DRIVE_IN_END);
      carX = ENTRY_X + (BAY_X - ENTRY_X) * p;
      wheelSpin = t * 6;
    } else if (cycleTime < DRIVE_OUT_START) {
      carX = BAY_X;
    } else if (cycleTime < DRIVE_OUT_END) {
      const p = ease((cycleTime - DRIVE_OUT_START) / (DRIVE_OUT_END - DRIVE_OUT_START));
      carX = BAY_X + (EXIT_X - BAY_X) * p;
      wheelSpin = t * 6;
    } else {
      carX = EXIT_X + 3; // parked off-screen during the pause beat
    }
    car.position.x = carX;
    car.userData.wheels.forEach((w) => { w.rotation.x = wheelSpin; });

    // --- Foam opacity + jitter ---
    let foamOpacity = 0;
    if (cycleTime > WASH_START && cycleTime < RINSE_END) {
      if (cycleTime < FOAM_PEAK) foamOpacity = ease((cycleTime - WASH_START) / (FOAM_PEAK - WASH_START));
      else if (cycleTime < SCRUB_END) foamOpacity = 1;
      else foamOpacity = 1 - ease((cycleTime - SCRUB_END) / (RINSE_END - SCRUB_END));
    }
    foamMat.opacity = foamOpacity * 0.92;

    if (foamOpacity > 0.01) {
      const dummy = new THREE.Object3D();
      foamSeeds.forEach((seed, i) => {
        const bob = Math.sin(t * 2.2 + seed.phase) * 0.06;
        dummy.position.set(carX + seed.x, seed.y + bob, seed.z);
        dummy.scale.setScalar(seed.scale * (0.85 + foamOpacity * 0.25));
        dummy.updateMatrix();
        foam.setMatrixAt(i, dummy.matrix);
      });
      foam.instanceMatrix.needsUpdate = true;
    }

    // --- Scrubbers sweep the car body during SCRUB window ---
    const scrubbing = cycleTime > SCRUB_START && cycleTime < SCRUB_END;
    scrubberA.visible = scrubbing;
    scrubberB.visible = scrubbing;
    if (scrubbing) {
      const sp = (cycleTime - SCRUB_START) / (SCRUB_END - SCRUB_START);
      scrubberA.position.set(carX - 1.2 + sp * 2.4, 0.15, 0.65);
      scrubberB.position.set(carX + 1.2 - sp * 2.4, 0.3, -0.65);
    }

    // --- Dirt tint fades to clean during rinse ---
    const dirty = cycleTime < WASH_START ? 1 : cycleTime < RINSE_END
      ? 1 - ease((cycleTime - SCRUB_START) / (RINSE_END - SCRUB_START))
      : 0;
    const base = car.userData.baseColor;
    const dirtColor = base.clone().lerp(new THREE.Color(0x5a4a3a), 0.35);
    car.userData.bodyMat.color.copy(base).lerp(dirtColor, Math.max(0, dirty));

    renderer.render(scene, camera);
  }

  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = document.visibilityState === 'visible';
    if (running) requestAnimationFrame(loop);
  });

  const clock = new THREE.Clock();

  function loop() {
    if (!running) return;
    render(clock.getElapsedTime());
    if (!prefersReduced) requestAnimationFrame(loop);
  }

  if (prefersReduced) {
    render(3); // static representative frame: car in bay, mid-wash
  } else {
    loop();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCarWash);
} else {
  initCarWash();
}
