import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';

// colors match the CSS variables in style.css
const COLORS = {
  bun: 0xf2a541,
  patty: 0x6b3e26,
  cheese: 0xffd84d,
  tomato: 0xe63946,
  lettuce: 0x6bbf59,
  seed: 0xfff6e5,
  ink: 0x2b2118
};
const OUTLINE = [0.025, 0.017, 0.01];

const container = document.getElementById('burger3d');
const heroArt = document.getElementById('hero-art');
const hero = document.getElementById('top');
const hint = document.querySelector('.burger-hint');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 3-step gradient gives the flat cartoon shading
const gradientMap = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
gradientMap.minFilter = THREE.NearestFilter;
gradientMap.magFilter = THREE.NearestFilter;
gradientMap.needsUpdate = true;

const toon = (color, thickness = 0.006) => {
  const material = new THREE.MeshToonMaterial({ color, gradientMap });
  material.userData.outlineParameters = { thickness, color: OUTLINE, alpha: 1, visible: true };
  return material;
};

// points along a circle, used to round off the edges of each layer's profile
const arc = (cx, cy, r, from, to, steps = 10) => {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const a = from + (to - from) * (i / steps);
    points.push(new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
  return points;
};

// spin a 2D side profile around the Y axis to get a round 3D shape
const lathe = (points) => new THREE.LatheGeometry(points, 72);

function makeTopBun() {
  const R = 1.2, H = 0.85, rb = 0.14;
  const points = [new THREE.Vector2(0, -rb), ...arc(R - rb, 0, rb, -Math.PI / 2, 0)];
  for (let i = 1; i <= 28; i++) {
    const a = (i / 28) * (Math.PI / 2);
    points.push(new THREE.Vector2(i === 28 ? 0 : R * Math.cos(a), H * Math.sin(a)));
  }

  const bun = new THREE.Group();
  bun.add(new THREE.Mesh(lathe(points), toon(COLORS.bun)));

  // sesame seeds spread evenly over the dome, lying flat on the surface
  const seedGeometry = new THREE.SphereGeometry(0.05, 10, 8);
  seedGeometry.scale(1, 0.45, 1.9);
  const seedMaterial = toon(COLORS.seed, 0.003);
  const up = new THREE.Vector3(0, 1, 0);
  const count = 26;
  const maxPolar = 1.15;

  for (let i = 0; i < count; i++) {
    const polar = Math.acos(1 - ((i + 0.5) / count) * (1 - Math.cos(maxPolar)));
    const a = Math.PI / 2 - polar;
    const phi = i * 2.39996; // golden angle
    const radial = R * Math.cos(a);
    const normal = new THREE.Vector3(
      (Math.cos(a) / R) * Math.cos(phi),
      Math.sin(a) / H,
      (Math.cos(a) / R) * Math.sin(phi)
    ).normalize();

    const seed = new THREE.Mesh(seedGeometry, seedMaterial);
    seed.position.set(radial * Math.cos(phi), H * Math.sin(a), radial * Math.sin(phi));
    seed.quaternion.setFromUnitVectors(up, normal);
    seed.rotateY(phi * 1.7);
    bun.add(seed);
  }

  return bun;
}

function makeBottomBun() {
  const R = 1.18, h = 0.42, rb = 0.16, rt = 0.06;
  const points = [
    new THREE.Vector2(0, -h),
    ...arc(R - rb, -h + rb, rb, -Math.PI / 2, 0),
    ...arc(R - rt, -rt, rt, 0, Math.PI / 2),
    new THREE.Vector2(0, 0)
  ];
  return new THREE.Mesh(lathe(points), toon(COLORS.bun));
}

function makePatty() {
  const R = 1.2, h = 0.36;
  const points = [
    new THREE.Vector2(0, -h / 2),
    ...arc(R - h / 2, 0, h / 2, -Math.PI / 2, Math.PI / 2, 14),
    new THREE.Vector2(0, h / 2)
  ];
  return new THREE.Mesh(lathe(points), toon(COLORS.patty));
}

function makeCheese() {
  // square slice whose corners droop over the patty
  const geometry = new THREE.BoxGeometry(2.1, 0.06, 2.1, 28, 1, 28);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const r = Math.hypot(position.getX(i), position.getZ(i));
    if (r > 0.95) {
      position.setY(i, position.getY(i) - (r - 0.95) ** 2 * 0.9);
    }
  }
  geometry.rotateY(Math.PI / 4);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, toon(COLORS.cheese));
}

function makeTomatoes() {
  const group = new THREE.Group();
  const geometry = new THREE.CylinderGeometry(0.52, 0.52, 0.1, 40);
  const material = toon(COLORS.tomato);
  for (let i = 0; i < 3; i++) {
    const angle = i * (Math.PI * 2 / 3) + 0.4;
    const slice = new THREE.Mesh(geometry, material);
    slice.position.set(Math.cos(angle) * 0.48, 0, Math.sin(angle) * 0.48);
    group.add(slice);
  }
  return group;
}

function makeLettuce() {
  // thin disc with a wavy, ruffled edge
  const R = 1.34;
  const geometry = new THREE.CylinderGeometry(R, R, 0.07, 120, 1);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const theta = Math.atan2(z, x);
    const k = Math.hypot(x, z) / R;
    const wobble = 1 + 0.05 * Math.sin(theta * 7 + 1);
    position.setX(i, x * wobble);
    position.setZ(i, z * wobble);
    position.setY(i, position.getY(i) + Math.sin(theta * 9) * 0.09 * k * k);
  }
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, toon(COLORS.lettuce));
}

const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

function main() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (error) {
    console.warn('WebGL is not available, keeping the CSS burger.', error);
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const effect = new OutlineEffect(renderer);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 1.4, 7.6);
  camera.lookAt(0, 0.05, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(3, 5, 4);
  scene.add(sun);

  // root tilts with the pointer, spinner turns, burger squishes and bobs
  const root = new THREE.Group();
  const spinner = new THREE.Group();
  const burger = new THREE.Group();
  scene.add(root);
  root.add(spinner);
  spinner.add(burger);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.45, 48),
    new THREE.MeshBasicMaterial({ color: COLORS.ink, transparent: true, opacity: 0.18, depthWrite: false })
  );
  shadow.material.userData.outlineParameters = { visible: false };
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.08;
  root.add(shadow);

  // bottom to top: [object, resting height, extra height when spread apart]
  const layers = [
    [makeBottomBun(), 0, -0.25],
    [makePatty(), 0.2, -0.08],
    [makeCheese(), 0.41, 0.05],
    [makeTomatoes(), 0.5, 0.17],
    [makeLettuce(), 0.6, 0.3],
    [makeTopBun(), 0.72, 0.52]
  ].map(([object, y, spread]) => {
    burger.add(object);
    return { object, y, spread };
  });

  // swap the CSS burger for the 3D one
  heroArt.classList.add('has-3d');
  container.appendChild(renderer.domElement);
  if (hint) hint.textContent = 'Psst, click the burger for a surprise (or drag to spin it)';

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(container);

  // only draw while the hero is on screen
  let visible = true;
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
  }).observe(container);

  let rotation = 0.6;
  let velocity = 0;
  const autoSpeed = reduceMotion ? 0 : 0.005;
  let dragging = false;
  let lastX = 0;
  let moved = 0;
  let wasDrag = false;
  let spread = 0;
  let spreadTarget = 0;
  let tiltX = 0, tiltY = 0, tiltTargetX = 0, tiltTargetY = 0;
  let squishStart = -1;
  let launchStart = -1;
  // how high each layer hops when clicked, bottom to top (the top bun flies highest)
  const launchHeights = [0, 0, 0.08, 0.2, 0.35, 1.2];
  let introStart = reduceMotion ? -10000 : null;

  // drag to spin
  container.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    moved = 0;
    container.setPointerCapture(event.pointerId);
  });

  container.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    lastX = event.clientX;
    moved += Math.abs(dx);
    velocity = dx * 0.012;
    rotation += velocity;
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    wasDrag = moved > 6;
  };
  container.addEventListener('pointerup', endDrag);
  container.addEventListener('pointercancel', endDrag);

  // a click (not the end of a drag) pops the burger open and picks a character
  container.addEventListener('click', () => {
    if (wasDrag) {
      wasDrag = false;
      return;
    }
    squishStart = performance.now();
    launchStart = reduceMotion ? -1 : squishStart;

    const rect = container.getBoundingClientRect();
    if (window.surprise) {
      window.surprise({ x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.35 });
    }
  });

  // layers spread apart on hover or keyboard focus
  container.addEventListener('pointerenter', () => { spreadTarget = 1; });
  container.addEventListener('pointerleave', () => { spreadTarget = 0; });
  container.addEventListener('focus', () => { spreadTarget = 1; });
  container.addEventListener('blur', () => { spreadTarget = 0; });

  // lean toward the pointer anywhere in the hero
  hero.addEventListener('pointermove', (event) => {
    const rect = hero.getBoundingClientRect();
    tiltTargetY = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    tiltTargetX = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  });
  hero.addEventListener('pointerleave', () => {
    tiltTargetX = 0;
    tiltTargetY = 0;
  });

  const frame = (now) => {
    requestAnimationFrame(frame);
    if (!visible) return;

    // start dropping the layers in once the preloader is gone
    if (introStart === null && !document.body.classList.contains('is-loading')) {
      introStart = now;
    }

    // ease back to the slow auto-spin after a drag
    if (!dragging) {
      velocity += (autoSpeed - velocity) * 0.05;
      rotation += velocity;
    }
    spinner.rotation.y = rotation;

    tiltX += (tiltTargetX - tiltX) * 0.08;
    tiltY += (tiltTargetY - tiltY) * 0.08;
    root.rotation.x = 0.12 + tiltX * 0.18;
    root.rotation.y = tiltY * 0.35;

    spread += (spreadTarget - spread) * 0.12;

    // click: the top bun flips up into the air and the layers under it hop
    let launch = 0;
    let flip = 0;
    if (launchStart >= 0) {
      const t = (now - launchStart) / 900;
      if (t >= 1) {
        launchStart = -1;
      } else {
        launch = Math.sin(Math.PI * t);
        flip = (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) * Math.PI * 2;
      }
    }
    const topBun = layers[layers.length - 1].object;
    topBun.rotation.x = flip;
    topBun.rotation.z = launch * 0.3;

    layers.forEach((layer, index) => {
      if (introStart === null) {
        layer.object.visible = false;
        return;
      }
      const t = Math.min(Math.max((now - introStart - 700 - index * 140) / 550, 0), 1);
      layer.object.visible = t > 0;
      const drop = (1 - easeOutBack(t)) * 3;
      layer.object.position.y = layer.y + layer.spread * spread + drop + launch * launchHeights[index];
    });
    shadow.visible = introStart !== null;

    let scaleXZ = 1;
    let scaleY = 1;
    if (squishStart >= 0) {
      const t = (now - squishStart) / 450;
      if (t >= 1) {
        squishStart = -1;
      } else {
        const s = Math.sin(Math.PI * t) * (1 - t * 0.5);
        scaleXZ = 1 + 0.14 * s;
        scaleY = 1 - 0.2 * s;
      }
    }
    burger.scale.set(scaleXZ, scaleY, scaleXZ);

    const bob = reduceMotion ? 0 : Math.sin(now * 0.002) * 0.05;
    burger.position.y = -0.55 + bob;
    shadow.scale.setScalar(1 - bob * 1.5);

    effect.render(scene, camera);
  };
  requestAnimationFrame(frame);
}

main();
