// The flight model: an arcade-true simulation of a small mail plane.
// State is heading/pitch/roll plus a scalar airspeed; the rules that make it
// feel like flying live here — lift that fades into a stall, coordinated
// turns that steepen with bank, speed traded against climb, fuel that burns
// with throttle, and ground contact that can be a landing, a bounce, a
// damaging arrival or a crash depending on how the plane meets it.
import { PLANE } from './config.js';

export function createFlightState(spawn) {
  return {
    position: new THREE.Vector3(spawn.x, spawn.y, spawn.z),
    heading: spawn.heading, // radians, 0 = north (-z), growing clockwise
    pitch: 0, // radians, nose up positive
    roll: 0, // radians, right wing down positive
    speed: 0, // m/s along the flight direction
    verticalSpeed: 0, // m/s, filled in each step for the instruments
    throttle: 0, // 0..1
    fuel: 100, // percent
    damage: 0, // percent; 100 is a wreck
    onGround: true,
    stalled: false,
    engineDead: false,
    crashed: false,
    crashReason: '',
    landed: false, // rolling on a surface after a touchdown this step
    touchdown: null, // details of the touchdown that just happened
  };
}

/** The unit vector the nose points along, from heading and pitch. */
export function forwardVector(state, out) {
  const cp = Math.cos(state.pitch);
  out.set(Math.sin(state.heading) * cp, Math.sin(state.pitch), -Math.cos(state.heading) * cp);
  return out;
}

/** Height of the wheels above whatever is under the plane. */
export function heightAboveGround(state, groundHeight) {
  return state.position.y - PLANE.gearHeight - groundHeight;
}

const _forward = new THREE.Vector3();

/**
 * Advance the simulation one step.
 * `world` supplies groundHeightAt(x, z), runwayAt(x, z) (the runway the point
 * is over, or null) and windAt(time) (a THREE.Vector3). Returns nothing; read
 * the results off the state (touchdown events land in state.touchdown).
 */
export function stepFlight(state, input, world, dt, time) {
  state.touchdown = null;
  if (state.crashed) return;

  // Throttle: keys walk it up or down, the wheel trims it in steps.
  state.throttle = clamp(state.throttle + input.throttleDelta * dt * 0.55, 0, 1);
  if (input.wheelSteps) {
    state.throttle = clamp(state.throttle + input.wheelSteps * 0.08, 0, 1);
    input.wheelSteps = 0;
  }

  // Fuel burns with throttle; an empty tank means a gliding plane.
  const burn = PLANE.fuelBurnIdle + (PLANE.fuelBurnFull - PLANE.fuelBurnIdle) * state.throttle;
  state.fuel = Math.max(0, state.fuel - burn * dt);
  state.engineDead = state.fuel <= 0;
  const power = state.engineDead ? 0 : state.throttle;

  // Stick: pitch and roll chase the input at a limited rate, so the plane
  // answers at once but never snaps.
  const pitchTarget = input.pitch * PLANE.maxPitch * (state.onGround ? 0.45 : 1);
  const rollTarget = input.roll * PLANE.maxRoll;
  state.pitch = approach(state.pitch, pitchTarget, PLANE.pitchRate * dt);
  state.roll = approach(state.roll, rollTarget, PLANE.rollRate * dt);

  // A coordinated turn: the steeper the bank, the faster the heading swings,
  // and a slow plane turns sluggishly — throttle and turn discipline matter.
  if (!state.onGround) {
    const turnAuthority = clamp(state.speed / 34, 0.25, 1);
    const headingRate = Math.tan(clamp(state.roll, -1.2, 1.2)) * (9.8 / Math.max(state.speed, 16)) * turnAuthority;
    state.heading += clamp(headingRate, -0.85, 0.85) * dt;
  } else if (state.speed > 2) {
    // Rolling on the ground, the rudder (roll keys) steers gently.
    state.heading += input.roll * 0.35 * dt * clamp(state.speed / 12, 0, 1);
    state.roll = approach(state.roll, 0, 3 * dt);
  }

  // Speed: thrust against drag, and gravity along the flight path — pitch up
  // and the plane pays for the climb out of its airspeed.
  const drag = PLANE.idleDrag + PLANE.dragK * state.speed * state.speed;
  let accel = power * PLANE.maxThrustAccel - drag - Math.sin(state.pitch) * PLANE.gravityAlongPath;
  if (state.onGround) accel -= input.brake ? 5.5 : 0.4; // brakes, plus rolling resistance
  if (!state.onGround && state.stalled) accel -= 2.2; // a stalled wing drags
  state.speed = clamp(state.speed + accel * dt, 0, PLANE.maxSpeed);

  // The stall: too slow and the wing lets go — the nose drops, the plane
  // sinks, and only diving for speed brings it back.
  state.stalled = !state.onGround && state.speed < PLANE.stallSpeed;
  if (state.stalled) {
    state.pitch = approach(state.pitch, -0.38, 0.9 * dt);
  }

  // Move along the flight direction, with a stall sink and the wind added.
  forwardVector(state, _forward);
  const before = state.position.clone();
  state.position.addScaledVector(_forward, state.speed * dt);
  if (state.stalled) state.position.y -= (1 - state.speed / PLANE.stallSpeed) * 9 * dt;
  const wind = world.windAt(time);
  state.position.addScaledVector(wind, dt);
  state.verticalSpeed = dt > 0 ? (state.position.y - before.y) / dt : 0;

  resolveGroundContact(state, world, dt);
}

function resolveGroundContact(state, world, dt) {
  const ground = world.groundHeightAt(state.position.x, state.position.z);
  const wheelY = state.position.y - PLANE.gearHeight;
  if (wheelY > ground + 0.02) {
    state.onGround = false;
    return;
  }
  // The wheels have met the surface: judge the meeting. Where the terrain
  // lies under water the surface is the sea itself, and meeting it is a
  // ditching no mail plane walks away from.
  if (ground < 0.05) {
    state.position.y = PLANE.gearHeight;
    crash(state, 'The plane came down in the sea.');
    return;
  }
  const runway = world.runwayAt(state.position.x, state.position.z);
  const sink = -state.verticalSpeed;
  const wasAirborne = !state.onGround;
  state.position.y = ground + PLANE.gearHeight;

  if (wasAirborne) {
    const alignment = runway ? headingAlignment(state.heading, runway.heading) : 0;
    state.touchdown = {
      runway, sinkRate: sink, speed: state.speed, alignment,
      position: state.position.clone(),
    };
    if (sink > 11 || state.pitch < -0.5) {
      crash(state, sink > 11
        ? `The plane struck the ground descending at ${sink.toFixed(0)} m/s — far beyond what the gear can take.`
        : 'The plane nosed into the ground.');
      return;
    }
    if (sink > 6.5) {
      state.damage = Math.min(100, state.damage + 26);
      state.touchdown.hard = true;
    } else if (sink > 4.2) {
      state.damage = Math.min(100, state.damage + 9);
      state.touchdown.firm = true;
    }
    if (!runway && ground > 1) {
      // An off-field arrival on rough island ground.
      state.damage = Math.min(100, state.damage + 18);
      state.touchdown.offField = true;
      if (state.speed > 30) {
        crash(state, 'The plane ran into rough ground at speed and broke up.');
        return;
      }
    }
    if (state.damage >= 100) {
      crash(state, 'The airframe gave way under the damage it had taken.');
      return;
    }
  }
  state.onGround = true;
  state.verticalSpeed = 0;
  // Rolling: the ground holds the plane's pitch near level unless the pilot
  // rotates at speed.
  if (state.speed < PLANE.rotateSpeed) {
    state.pitch = approach(state.pitch, 0, 4 * dt);
  } else if (state.pitch > 0.06) {
    state.onGround = false; // rotated and fast enough: airborne
    state.position.y += 0.05;
  }
}

function headingAlignment(heading, runwayHeading) {
  let diff = Math.abs(((heading - runwayHeading) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  return 1 - Math.min(1, Math.abs(diff) / (Math.PI / 2)); // 1 = squarely along the strip
}

function crash(state, reason) {
  state.crashed = true;
  state.crashReason = reason;
  state.damage = 100;
  state.speed = 0;
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function approach(value, target, maxStep) {
  if (value < target) return Math.min(target, value + maxStep);
  return Math.max(target, value - maxStep);
}
