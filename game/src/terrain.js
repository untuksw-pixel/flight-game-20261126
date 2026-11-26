// The archipelago: one height function the physics and the mesh both read,
// so the ground the pilot sees is exactly the ground the wheels meet.
// On top of it: three flattened runway plateaus with painted strips, a
// village and tower at the home field, a lighthouse, the drop zone, and a
// few hundred low-poly pines.
import { ISLANDS, WORLD } from './config.js';

export const RUNWAYS = [WORLD.homeRunway, WORLD.northRunway, WORLD.eastRunway];

// A small deterministic value-noise, so the islands roll instead of bulging
// like perfect domes, and so every run of the game builds the same world.
function rollingNoise(x, z) {
  return (
    Math.sin(x * 0.011 + Math.sin(z * 0.007) * 2.1) * Math.cos(z * 0.009 + Math.sin(x * 0.006) * 1.7) * 0.6 +
    Math.sin(x * 0.033 + z * 0.021) * Math.cos(z * 0.027 - x * 0.017) * 0.4
  );
}

/** Terrain height in metres at a point; negative under the sea. */
export function groundHeightAt(x, z) {
  let height = -20;
  for (const island of ISLANDS) {
    const dx = x - island.x;
    const dz = z - island.z;
    const d2 = (dx * dx + dz * dz) / (island.radius * island.radius);
    height += island.peak * Math.exp(-d2 * 2.0);
  }
  if (height > 0) height += rollingNoise(x, z) * Math.min(14, 2 + height * 0.12);
  // Each runway sits on a plateau graded flat to its elevation.
  for (const runway of RUNWAYS) {
    const s = Math.abs(x - runway.x);
    const t = Math.abs(z - runway.z);
    const flatS = runway.width / 2 + 26;
    const flatT = runway.length / 2 + 42;
    if (s < flatS + 130 && t < flatT + 130) {
      const over = Math.max((s - flatS) / 130, (t - flatT) / 130, 0);
      const blend = over <= 0 ? 1 : Math.max(0, 1 - over) ** 2;
      height = height * (1 - blend) + runway.elevation * blend;
    }
  }
  return height;
}

/** The runway a point is over (within its painted rectangle), or null. */
export function runwayAt(x, z) {
  for (const runway of RUNWAYS) {
    if (Math.abs(x - runway.x) <= runway.width / 2 && Math.abs(z - runway.z) <= runway.length / 2) return runway;
  }
  return null;
}

// ---------------------------------------------------------------------------

function runwayTexture(runway) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 1024;
  const pen = canvas.getContext('2d');
  pen.fillStyle = '#33373d';
  pen.fillRect(0, 0, 128, 1024);
  pen.fillStyle = '#3d4249';
  for (let i = 0; i < 260; i += 1) pen.fillRect(Math.random() * 128, Math.random() * 1024, 3, 3);
  pen.fillStyle = '#e8e6df';
  pen.fillRect(4, 0, 4, 1024);
  pen.fillRect(120, 0, 4, 1024);
  // Threshold bars at both ends.
  for (const endY of [18, 1024 - 18 - 64]) {
    for (let bar = 0; bar < 4; bar += 1) pen.fillRect(18 + bar * 26, endY, 14, 64);
  }
  // Centreline dashes.
  for (let y = 120; y < 1024 - 120; y += 84) pen.fillRect(60, y, 8, 44);
  // The runway number, read by a pilot landing toward the north.
  pen.save();
  pen.translate(64, 170);
  pen.font = 'bold 64px Georgia, serif';
  pen.textAlign = 'center';
  pen.fillText('36', 0, 0);
  pen.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

function buildRunway(runway) {
  const group = new THREE.Group();
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(runway.width, 0.35, runway.length),
    new THREE.MeshLambertMaterial({ map: runwayTexture(runway) }),
  );
  strip.position.set(runway.x, runway.elevation + 0.1, runway.z);
  group.add(strip);
  // Edge lights: small warm lamps down both sides, lit day and night.
  const lampGeometry = new THREE.SphereGeometry(0.55, 6, 5);
  const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xffc46b });
  const lamps = new THREE.InstancedMesh(lampGeometry, lampMaterial, 48);
  const m = new THREE.Matrix4();
  let index = 0;
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 24; i += 1) {
      const z = runway.z - runway.length / 2 + 16 + (i * (runway.length - 32)) / 23;
      m.setPosition(runway.x + side * (runway.width / 2 + 2.2), runway.elevation + 0.7, z);
      lamps.setMatrixAt(index, m);
      index += 1;
    }
  }
  group.add(lamps);
  return group;
}

function buildHouse(x, z, wallColor, roofColor, size) {
  const y = groundHeightAt(x, z);
  const group = new THREE.Group();
  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(size, size * 0.62, size * 0.85),
    new THREE.MeshLambertMaterial({ color: wallColor }),
  );
  walls.position.y = size * 0.31;
  group.add(walls);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(size * 0.78, size * 0.5, 4),
    new THREE.MeshLambertMaterial({ color: roofColor }),
  );
  roof.position.y = size * 0.62 + size * 0.25;
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.85;
  group.add(roof);
  group.position.set(x, y - 0.2, z);
  group.rotation.y = (Math.sin(x * 12.9898 + z * 78.233) * 0.5 + 0.5) * Math.PI;
  return group;
}

function buildHomeField() {
  const group = new THREE.Group();
  const runway = WORLD.homeRunway;
  // Control tower.
  const towerX = runway.x + 85;
  const towerZ = runway.z - 120;
  const towerY = groundHeightAt(towerX, towerZ);
  const shaft = new THREE.Mesh(
    new THREE.BoxGeometry(7, 24, 7),
    new THREE.MeshLambertMaterial({ color: 0xd8d2c4 }),
  );
  shaft.position.set(towerX, towerY + 12, towerZ);
  group.add(shaft);
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(10, 4.5, 10),
    new THREE.MeshPhongMaterial({ color: 0x2c4a63, shininess: 90 }),
  );
  cab.position.set(towerX, towerY + 26, towerZ);
  group.add(cab);
  // Two hangars west of the strip.
  for (const [hx, hz] of [[runway.x - 95, runway.z + 40], [runway.x - 95, runway.z + 130]]) {
    const hy = groundHeightAt(hx, hz);
    const hangar = new THREE.Mesh(
      new THREE.BoxGeometry(30, 9, 24),
      new THREE.MeshLambertMaterial({ color: 0x9a4f3a }),
    );
    hangar.position.set(hx, hy + 4.5, hz);
    group.add(hangar);
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(15.5, 15.5, 24, 12, 1, false, 0, Math.PI),
      new THREE.MeshLambertMaterial({ color: 0x6e6e6e }),
    );
    roof.rotation.z = Math.PI / 2;
    roof.rotation.y = Math.PI / 2;
    roof.position.set(hx, hy + 9, hz);
    group.add(roof);
  }
  // The village: pastel houses strung along the coast east of the field.
  const wallColors = [0xf2e3c2, 0xe8b4a0, 0xcfe0ea, 0xf5efdd, 0xdcc7e8, 0xffe9a8];
  const roofColors = [0x9a4f3a, 0x74553a, 0x51606e, 0x7a3b2e];
  for (let i = 0; i < 18; i += 1) {
    const hx = 330 + (i % 6) * 46 + Math.sin(i * 7.3) * 12;
    const hz = -60 + Math.floor(i / 6) * 58 + Math.cos(i * 3.1) * 10;
    group.add(buildHouse(hx, hz, wallColors[i % wallColors.length], roofColors[i % roofColors.length], 11 + (i % 3) * 2.5));
  }
  // A lighthouse on the south-east point of the main island.
  const lx = 760;
  const lz = 560;
  const ly = groundHeightAt(lx, lz);
  const bands = [0xf3efe4, 0xc23b2a, 0xf3efe4, 0xc23b2a];
  for (let i = 0; i < 4; i += 1) {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4 - i * 0.3, 3.7 - i * 0.3, 4.4, 10),
      new THREE.MeshLambertMaterial({ color: bands[i] }),
    );
    band.position.set(lx, ly + 2.2 + i * 4.4, lz);
    group.add(band);
  }
  const lampRoom = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe9a3 }),
  );
  lampRoom.position.set(lx, ly + 19.5, lz);
  group.add(lampRoom);
  return group;
}

function buildDropZone() {
  const zone = WORLD.dropZone;
  const y = groundHeightAt(zone.x, zone.z);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const pen = canvas.getContext('2d');
  pen.strokeStyle = '#ffd23e';
  pen.lineWidth = 12;
  pen.beginPath();
  pen.arc(128, 128, 112, 0, Math.PI * 2);
  pen.stroke();
  pen.lineWidth = 6;
  pen.beginPath();
  pen.arc(128, 128, 52, 0, Math.PI * 2);
  pen.stroke();
  pen.fillStyle = '#ffd23e';
  pen.font = 'bold 34px Georgia, serif';
  pen.textAlign = 'center';
  pen.fillText('DROP', 128, 140);
  const marker = new THREE.Mesh(
    new THREE.CircleGeometry(zone.radius, 40),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(zone.x, y + 0.5, zone.z);
  const group = new THREE.Group();
  group.add(marker);
  // Crates waiting by the circle.
  for (const [cx, cz] of [[-30, 18], [-22, 26], [26, -14]]) {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(4, 4, 4),
      new THREE.MeshLambertMaterial({ color: 0xa9803e }),
    );
    crate.position.set(zone.x + cx, y + 2, zone.z + cz);
    crate.rotation.y = cx;
    group.add(crate);
  }
  return group;
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function buildForest() {
  const random = seededRandom(20261126);
  const spots = [];
  for (let i = 0; i < 2600 && spots.length < 650; i += 1) {
    const x = (random() - 0.5) * WORLD.extent * 0.92;
    const z = (random() - 0.5) * WORLD.extent * 0.92;
    const h = groundHeightAt(x, z);
    if (h < 3 || h > 130) continue;
    if (runwayAt(x, z)) continue;
    if (Math.abs(x - WORLD.homeRunway.x) < 90 && Math.abs(z - WORLD.homeRunway.z) < 430) continue;
    spots.push([x, h, z, 0.7 + random() * 0.8]);
  }
  const trunkGeometry = new THREE.CylinderGeometry(0.35, 0.5, 3.2, 5);
  const canopyGeometry = new THREE.ConeGeometry(2.6, 8.5, 7);
  const trunks = new THREE.InstancedMesh(trunkGeometry, new THREE.MeshLambertMaterial({ color: 0x6b4a2e }), spots.length);
  const canopies = new THREE.InstancedMesh(canopyGeometry, new THREE.MeshLambertMaterial({ color: 0x2f6b33 }), spots.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const pos = new THREE.Vector3();
  spots.forEach(([x, h, z, s], index) => {
    scale.set(s, s, s);
    pos.set(x, h + 1.6 * s, z);
    m.compose(pos, q, scale);
    trunks.setMatrixAt(index, m);
    pos.y = h + (3.2 + 4.2) * s;
    m.compose(pos, q, scale);
    canopies.setMatrixAt(index, m);
  });
  const group = new THREE.Group();
  group.add(trunks);
  group.add(canopies);
  return group;
}

/** Build the whole landscape into the scene: terrain mesh, sea, and set dressing. */
export function buildWorld(scene) {
  const segments = 150;
  const geometry = new THREE.PlaneGeometry(WORLD.extent, WORLD.extent, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const h = groundHeightAt(x, z);
    positions.setY(i, h);
    // Paint by height and steepness: sand, grass, dark forest, rock, snow.
    const slope = Math.abs(groundHeightAt(x + 14, z) - h) + Math.abs(groundHeightAt(x, z + 14) - h);
    if (h < 0) color.setHex(0xc2b280).lerp(new THREE.Color(0x39657f), Math.min(1, -h / 22));
    else if (h < 2.2) color.setHex(0xdcc48f);
    else if (slope > 9) color.setHex(0x8a8175);
    else if (h > 175) color.setHex(0xeef3f6);
    else if (h > 60) color.setHex(0x4d7d3a);
    else color.setHex(0x69a84f);
    if (h >= 2.2 && slope <= 9 && h <= 175) {
      const shade = 0.92 + ((Math.sin(x * 0.05) * Math.cos(z * 0.043) + 1) / 2) * 0.16;
      color.multiplyScalar(shade);
    }
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const terrain = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
  scene.add(terrain);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.extent * 3.2, WORLD.extent * 3.2),
    new THREE.MeshPhongMaterial({ color: 0x1b6ea6, transparent: true, opacity: 0.88, shininess: 160, specular: 0x99ccee }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = WORLD.seaLevel;
  scene.add(sea);

  for (const runway of RUNWAYS) scene.add(buildRunway(runway));
  scene.add(buildHomeField());
  scene.add(buildDropZone());
  scene.add(buildForest());
  return { sea };
}
