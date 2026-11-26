// The Kestrel Post plane, built from primitives: a lathe-turned fuselage in
// mail-plane white and red, a spinning two-blade propeller, control surfaces
// that visibly deflect with the stick, a glazed canopy and fixed gear.
// One THREE.Group whose origin sits at the centre of gravity; the flight
// model moves it, this file only makes it look built and flown.
export function buildAircraft() {
  const plane = new THREE.Group();
  const paint = new THREE.MeshPhongMaterial({ color: 0xf4f1e8, shininess: 42 });
  const red = new THREE.MeshPhongMaterial({ color: 0xb3392b, shininess: 42 });
  const darkMetal = new THREE.MeshPhongMaterial({ color: 0x3a3f45, shininess: 70 });
  const glass = new THREE.MeshPhongMaterial({ color: 0x9fd4e8, shininess: 120, transparent: true, opacity: 0.75 });

  // Fuselage: a lathe profile from spinner to tail cone (nose toward -z).
  const profile = [];
  const stations = [
    [0.01, -4.6], [0.42, -4.35], [0.78, -3.7], [0.95, -2.6], [1.0, -1.2],
    [1.0, 0.4], [0.9, 1.8], [0.66, 3.2], [0.4, 4.4], [0.16, 5.4], [0.03, 5.9],
  ];
  for (const [radius, z] of stations) profile.push(new THREE.Vector2(radius, -z));
  const fuselage = new THREE.Mesh(new THREE.LatheGeometry(profile, 14), paint);
  fuselage.rotation.x = Math.PI / 2;
  plane.add(fuselage);

  // Engine cowling band and exhaust stub, painted like the fuselage so the
  // nose reads as one shape from the cockpit.
  const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.86, 0.7, 14), paint);
  cowl.rotation.x = Math.PI / 2;
  cowl.position.z = -3.95;
  plane.add(cowl);

  // Propeller: spinner cone plus two blades, spun by setThrottleVisuals.
  const propeller = new THREE.Group();
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.8, 10), red);
  spinner.rotation.x = -Math.PI / 2;
  spinner.position.z = -0.4;
  propeller.add(spinner);
  const bladeMaterial = new THREE.MeshPhongMaterial({ color: 0x2c3034, shininess: 60, transparent: true });
  const blades = [];
  for (const flip of [0, Math.PI]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.26, 2.3, 0.08), bladeMaterial);
    const holder = new THREE.Group();
    holder.add(blade);
    holder.rotation.z = flip;
    blade.position.set(0, 1.28, 0);
    propeller.add(holder);
    blades.push(blade);
  }
  // The blur disc the spinning prop paints in the air; it fades in with rpm
  // so a running engine reads as a disc, not two frozen blades.
  const propDisc = new THREE.Mesh(
    new THREE.CircleGeometry(2.5, 28),
    new THREE.MeshBasicMaterial({ color: 0x1c1f22, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  propDisc.position.z = -0.06;
  propeller.add(propDisc);
  propeller.position.z = -4.45;
  plane.add(propeller);

  // Main wing with red tips, and ailerons that deflect with roll input.
  const wingGroup = new THREE.Group();
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.16, 1.7), paint);
  wingGroup.add(wing);
  for (const side of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.17, 1.7), red);
    tip.position.x = side * 5.4;
    wingGroup.add(tip);
  }
  wingGroup.position.set(0, 0.62, -0.7);
  plane.add(wingGroup);
  const ailerons = [];
  for (const side of [-1, 1]) {
    const aileron = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.09, 0.55), red);
    aileron.position.set(side * 4.1, 0.62, 0.42);
    const pivot = new THREE.Group();
    pivot.position.set(side * 4.1, 0.62, 0.18);
    aileron.position.set(0, 0, 0.3);
    pivot.add(aileron);
    plane.add(pivot);
    ailerons.push({ pivot, side });
  }

  // Tail: stabiliser, fin, and a rudder that swings with the turn.
  const stabiliser = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.13, 1.1), paint);
  stabiliser.position.set(0, 0.28, 5.2);
  plane.add(stabiliser);
  const elevator = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.08, 0.5), red);
  const elevatorPivot = new THREE.Group();
  elevatorPivot.position.set(0, 0.28, 5.55);
  elevator.position.set(0, 0, 0.28);
  elevatorPivot.add(elevator);
  plane.add(elevatorPivot);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.7, 1.5), red);
  fin.position.set(0, 1.05, 5.15);
  plane.add(fin);
  const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.5, 0.55), paint);
  const rudderPivot = new THREE.Group();
  rudderPivot.position.set(0, 1.0, 5.75);
  rudder.position.set(0, 0, 0.3);
  rudderPivot.add(rudder);
  plane.add(rudderPivot);

  // Canopy glass over the cockpit.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.92, 12, 10), glass);
  canopy.scale.set(0.82, 0.62, 1.7);
  canopy.position.set(0, 0.95, -0.5);
  plane.add(canopy);

  // Fixed landing gear: two mains and a tail wheel, with struts.
  const gear = new THREE.Group();
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.5, 6), darkMetal);
    strut.position.set(side * 1.05, -1.05, -0.6);
    strut.rotation.z = side * 0.25;
    gear.add(strut);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.3, 12), darkMetal);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 1.25, -1.72, -0.6);
    gear.add(wheel);
  }
  const tailWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 10), darkMetal);
  tailWheel.rotation.z = Math.PI / 2;
  tailWheel.position.set(0, -0.72, 5.3);
  gear.add(tailWheel);
  plane.add(gear);

  // A mail sack slung in a belly pod — the point of every sortie.
  const pod = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 1.6), new THREE.MeshPhongMaterial({ color: 0xc8a24a, shininess: 20 }));
  pod.position.set(0, -0.95, 0.6);
  plane.add(pod);

  // The cockpit deck: cowling top and glareshield that fill the bottom of
  // the windscreen in cockpit view. Hidden in chase view, where the camera
  // sits behind the plane and would see it floating.
  const cockpitDeck = new THREE.Group();
  const deckMaterial = new THREE.MeshPhongMaterial({ color: 0x232a30, shininess: 30 });
  const cowlTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.34, 2.3), deckMaterial);
  cowlTop.position.set(0, 0.3, -2.75);
  cockpitDeck.add(cowlTop);
  const glareshield = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 0.14), deckMaterial);
  glareshield.position.set(0, 0.5, -1.15);
  glareshield.rotation.x = -0.42;
  cockpitDeck.add(glareshield);
  cockpitDeck.visible = false;
  plane.add(cockpitDeck);

  // In cockpit view the camera sits just behind the propeller arc: solid
  // blades would slash across the windscreen and the blur disc would fill
  // it, so the cockpit shows only a whisper of the disc, the way a pilot's
  // eye tunes the spinning prop out.
  let cockpitView = false;

  return {
    group: plane,
    propeller,
    propDisc,
    bladeMaterial,
    canopy,
    cockpitDeck,
    /** Tell the plane whether the pilot's own view is the one being drawn. */
    setCockpitView(on) {
      cockpitView = on;
      for (const blade of blades) blade.visible = !on;
    },
    /** Pose the plane from the flight state; spin the prop; work the surfaces. */
    update(state, input, dt, time) {
      plane.position.copy(state.position);
      plane.rotation.order = 'YXZ';
      plane.rotation.y = -state.heading;
      plane.rotation.x = state.pitch;
      plane.rotation.z = -state.roll;
      const rpm = state.engineDead ? 0 : 4 + state.throttle * 42 + state.speed * 0.5;
      propeller.rotation.z += rpm * dt * (state.crashed ? 0 : 1);
      const discOpacity = state.crashed || state.engineDead ? 0 : Math.min(0.09, rpm * 0.004);
      propDisc.material.opacity = cockpitView ? Math.min(0.045, discOpacity) : discOpacity;
      // Past windmilling speed the blades vanish into the disc entirely.
      bladeMaterial.opacity = state.crashed ? 1 : Math.max(0, Math.min(1, (26 - rpm) / 14));
      for (const { pivot, side } of ailerons) pivot.rotation.x = -input.roll * 0.5 * side;
      elevatorPivot.rotation.x = input.pitch * 0.45;
      rudderPivot.rotation.y = -input.roll * 0.4;
    },
  };
}
