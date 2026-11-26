// Sky, sun and clouds: a gradient dome, one warm directional light with a
// hemisphere fill, drifting low-poly cloud puffs, and a visible sun disc —
// one consistent late-morning look shared by every screenshot.
export function buildSky(scene) {
  // Gradient dome painted on a canvas: deep blue up top, pale at the horizon.
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 256;
  const pen = canvas.getContext('2d');
  const gradient = pen.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#2c63b8');
  gradient.addColorStop(0.45, '#6fa8dc');
  gradient.addColorStop(0.72, '#bcd9ef');
  gradient.addColorStop(0.8, '#e8f1e6');
  gradient.addColorStop(1, '#e8f1e6');
  pen.fillStyle = gradient;
  pen.fillRect(0, 0, 16, 256);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(9000, 24, 14),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), side: THREE.BackSide, fog: false }),
  );
  scene.add(dome);

  const sunLight = new THREE.DirectionalLight(0xfff2d8, 1.15);
  sunLight.position.set(2600, 3400, 1400);
  scene.add(sunLight);
  scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x54683f, 0.75));

  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(260, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff3b0, fog: false }),
  );
  sunDisc.position.copy(sunLight.position).multiplyScalar(2.6);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);

  scene.fog = new THREE.Fog(0xcfe0ec, 2600, 8800);
  return { dome };
}

/** A field of soft cloud puffs that drift slowly with the wind. */
export function buildClouds(scene, count) {
  const group = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x7d838c, transparent: true, opacity: 0.95 });
  const random = (seed => () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  })(987654321);
  const clouds = [];
  for (let i = 0; i < count; i += 1) {
    const cloud = new THREE.Group();
    const puffs = 4 + Math.floor(random() * 4);
    for (let p = 0; p < puffs; p += 1) {
      const radius = 26 + random() * 42;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), material);
      puff.position.set((p - puffs / 2) * radius * 0.9 + random() * 14, random() * 10, random() * 26 - 13);
      puff.scale.y = 0.42;
      cloud.add(puff);
    }
    cloud.position.set((random() - 0.5) * 9000, 330 + random() * 260, (random() - 0.5) * 9000);
    clouds.push(cloud);
    group.add(cloud);
  }
  scene.add(group);
  return {
    group,
    update(dt, wind) {
      for (const cloud of clouds) {
        cloud.position.x += wind.x * dt * 0.6;
        cloud.position.z += wind.z * dt * 0.6;
        if (cloud.position.x > 5200) cloud.position.x = -5200;
        if (cloud.position.x < -5200) cloud.position.x = 5200;
        if (cloud.position.z > 5200) cloud.position.z = -5200;
        if (cloud.position.z < -5200) cloud.position.z = 5200;
      }
    },
  };
}
