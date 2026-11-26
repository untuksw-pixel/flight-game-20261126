// Kestrel Post — tuning constants and world layout.
// Every number the flight model, terrain and missions share lives here, so the
// rest of the code reads as rules rather than magic numbers.

// ---- World layout (metres; x east, z south, heading 0 faces -z, "north") --
export const WORLD = {
  seaLevel: 0,
  extent: 7600, // the terrain mesh spans this many metres across
  homeRunway: { x: 150, z: -160, length: 700, width: 30, heading: 0, elevation: 14, name: 'Kestrel Field' },
  northRunway: { x: -1500, z: -2500, length: 450, width: 24, heading: 0, elevation: 10, name: 'North Isle Strip' },
  eastRunway: { x: 2300, z: -1100, length: 420, width: 24, heading: 0, elevation: 9, name: 'East Isle Strip' },
  dropZone: { x: 2150, z: -950, radius: 90, name: 'East Isle drop zone' },
};

// Island shapes the terrain height function is built from: a smooth dome per
// island, its peak pushed inland so the runway coasts stay low.
export const ISLANDS = [
  { x: -350, z: -550, peak: 250, radius: 1050 }, // main island, mountain inland
  { x: -1500, z: -2650, peak: 120, radius: 520 }, // north isle
  { x: 2350, z: -1250, peak: 95, radius: 460 }, // east isle
  { x: 900, z: 1500, peak: 40, radius: 380 }, // a low southern cay, no strip
];

// ---- Aircraft performance -------------------------------------------------
export const PLANE = {
  maxThrustAccel: 9.5, // m/s^2 at full throttle, before drag
  dragK: 0.0016, // quadratic drag coefficient
  idleDrag: 1.1, // m/s^2 of drag that is always there
  gravityAlongPath: 9.8, // climbing costs speed, diving gains it
  stallSpeed: 21, // m/s; below this the wing stops holding the nose up
  rotateSpeed: 25, // m/s; on the ground, pitch up past this to lift off
  maxSpeed: 82, // m/s, the airframe's never-exceed speed
  maxPitch: 0.62, // radians of nose up/down the controls can hold
  maxRoll: 1.15, // radians of bank the controls can hold
  pitchRate: 1.5, // how fast pitch chases the stick, per second
  rollRate: 2.6, // how fast roll chases the stick, per second
  gearHeight: 1.6, // metres from the fuselage origin to the wheels
  fuelBurnFull: 0.55, // percent of tank per second at full throttle
  fuelBurnIdle: 0.08, // percent of tank per second at idle
};

// ---- Scoring ---------------------------------------------------------------
export const SCORE = {
  ring: 150,
  dropOnTarget: 400,
  dropNear: 150,
  landingBase: 300,
  landingPerfection: 300, // scaled by how gentle and centred the touchdown is
  secondBonus: 4, // points per second under the par time
};

// ---- Display units ----------------------------------------------------------
export const MS_TO_KNOTS = 1.94384;
export const M_TO_FEET = 3.28084;
