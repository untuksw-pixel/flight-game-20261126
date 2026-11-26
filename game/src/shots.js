// Screenshot scenes behind ?shot=takeoff|rings|cockpit|approach.
// Like the kit starter's shots, each scene starts from a fresh mission and
// plays the real rules forward with an autopilot at the stick, so the frame
// a screenshot captures is a frame the game itself produces — the same seed
// always stages the same moment. main.js freezes the simulation once the
// scene is staged and keeps rendering it.
const STEP = 1 / 60;

/** Point the autopilot at a target: bank toward it, climb or sink to it, hold a cruise throttle. */
function steerToward(game, target, cruiseSpeed) {
  const { state, input } = game;
  const dx = target.x - state.position.x;
  const dz = target.z - state.position.z;
  const desiredHeading = Math.atan2(dx, -dz);
  let diff = ((desiredHeading - state.heading) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  input.roll = Math.max(-1, Math.min(1, diff * 1.5));
  const dy = target.y - state.position.y;
  input.pitch = Math.max(-1, Math.min(1, dy * 0.012 - state.pitch * 0.4 + (cruiseSpeed - state.speed) * 0.004));
  input.throttleDelta = Math.max(-1, Math.min(1, (cruiseSpeed - state.speed) * 0.06));
}

function flySteps(game, steps, control) {
  for (let i = 0; i < steps; i += 1) {
    control(game);
    game.step(STEP);
    game.elapsed += STEP; // the HUD clock shows the seconds actually flown
    if (game.state.crashed) break;
  }
}

function takeoffRoll(game) {
  const { state, input } = game;
  input.roll = 0;
  input.throttleDelta = 1;
  input.pitch = state.speed > 25 ? 0.75 : 0;
}

/**
 * Stage the named scene on a fresh game. Returns a short description of the
 * moment staged, for the maker's own notes.
 */
export function stageShot(game, name) {
  if (name === 'rings') {
    game.startMission(0);
    // Take off and climb out toward the first harbour ring, then settle onto
    // the course for it, close enough that the ring ahead reads large in
    // the frame with the island falling away below.
    flySteps(game, 60 * 7, takeoffRoll);
    const ring = { x: 150, y: 140, z: -1150 };
    flySteps(game, 60 * 21, (g) => steerToward(g, ring, 47));
    game.setView('chase');
    return 'airborne on the ring course, first ring ahead';
  }
  if (name === 'cockpit') {
    game.startMission(0);
    // Staged on short final: airborne over the bay, lined up on Kestrel
    // Field a few hundred metres out, flown down the approach by the
    // autopilot at approach speed with the throttle alive.
    game.spawnAirborne({ x: 150, y: 58, z: 470 }, 0, 33);
    game.setView('cockpit');
    const threshold = { x: 150, y: 22, z: -330 };
    flySteps(game, 60 * 7, (g) => steerToward(g, threshold, 35));
    // The descent bleeds the autopilot's throttle to idle; a flown final
    // carries a little power, so stage the throttle where a pilot holds it.
    game.state.throttle = 0.35;
    return 'cockpit view on final approach, runway ahead';
  }
  if (name === 'approach') {
    game.startMission(1);
    // Staged mid-crossing to the east isle: the orange next ring ahead,
    // the drop island beyond it, the sea below.
    game.spawnAirborne({ x: 560, y: 138, z: -700 }, 1.35, 47);
    game.setView('chase');
    const ring = { x: 900, y: 135, z: -720 };
    flySteps(game, 60 * 3, (g) => steerToward(g, ring, 47));
    return 'crossing to East Isle, guide ring ahead';
  }
  // Default: the takeoff — full throttle down the home runway, caught at
  // the moment of rotation as the village and the mountain slide past.
  game.startMission(0);
  flySteps(game, 60 * 5.4, takeoffRoll);
  game.setView('chase');
  return 'takeoff roll at Kestrel Field';
}
