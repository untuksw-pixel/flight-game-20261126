// Missions and scoring: three sorties with different jobs to do — a ring
// circuit home, a parcel drop on the east isle, and a storm run to the
// north strip on a short tank. This file owns the objective sequence, the
// glowing rings, the falling parcel, and the score the debrief reads out.
import { SCORE, WORLD } from './config.js';

export const MISSIONS = [
  {
    id: 'first-post',
    title: 'First Post',
    briefing: 'Take off from Kestrel Field, fly the six harbour rings, and land back home. A gentle first round: full tank, light airs.',
    parSeconds: 300,
    fuel: 100,
    wind: { x: 1.5, z: 0.5, gust: 0 },
    objectives: [
      { type: 'rings', label: 'Fly the harbour rings', points: [[150, 140, -1150], [-700, 175, -1500], [-1450, 140, -700], [-1250, 120, 300], [-300, 110, 1050], [600, 100, 500]] },
      { type: 'land', label: 'Land at Kestrel Field', runway: WORLD.homeRunway },
    ],
  },
  {
    id: 'east-drop',
    title: 'East Isle Drop',
    briefing: 'Carry the mail sack east. Two rings mark the way; drop the parcel inside the yellow circle on East Isle, then put down on the East Isle Strip.',
    parSeconds: 330,
    fuel: 85,
    wind: { x: 3, z: 1, gust: 0.6 },
    objectives: [
      { type: 'rings', label: 'Follow the guide rings east', points: [[900, 135, -720], [1520, 125, -920]] },
      { type: 'drop', label: 'Drop the parcel in the yellow circle', zone: WORLD.dropZone },
      { type: 'land', label: 'Land at East Isle Strip', runway: WORLD.eastRunway },
    ],
  },
  {
    id: 'storm-mail',
    title: 'Storm Mail',
    briefing: 'A front is coming in and the north isle needs its medicine. Strong crosswind, gusts, and only 70% fuel: fly the two pass rings and land on the North Isle Strip.',
    parSeconds: 330,
    fuel: 70,
    wind: { x: 10, z: 3, gust: 5 },
    objectives: [
      { type: 'rings', label: 'Thread the pass rings', points: [[-620, 190, -950], [-1350, 150, -1850]] },
      { type: 'land', label: 'Land at North Isle Strip', runway: WORLD.northRunway },
    ],
  },
];

const RING_RADIUS = 17;

export function createMissionRunner(scene, mission) {
  const runner = {
    mission,
    objectiveIndex: 0,
    ringIndex: 0,
    score: 0,
    ringsFlown: 0,
    ringsTotal: 0,
    dropResult: null, // 'target' | 'near' | 'lost' once the parcel lands
    dropPoints: 0,
    tookOff: false,
    finished: false,
    success: false,
    landing: null, // filled when the sortie ends on the ground
    message: '',
    messageUntil: 0,
    parcel: null,
    ringsGroup: new THREE.Group(),
  };
  for (const objective of mission.objectives) {
    if (objective.type === 'rings') runner.ringsTotal += objective.points.length;
  }
  scene.add(runner.ringsGroup);
  buildRingMeshes(runner);
  return runner;
}

function buildRingMeshes(runner) {
  runner.ringsGroup.clear();
  const objective = runner.mission.objectives[runner.objectiveIndex];
  if (!objective || objective.type !== 'rings') return;
  objective.points.forEach((point, index) => {
    const isNext = index === runner.ringIndex;
    const isDone = index < runner.ringIndex;
    const material = new THREE.MeshBasicMaterial({
      color: isDone ? 0x53d769 : isNext ? 0xffa726 : 0x2ec4b6,
      transparent: true,
      opacity: isDone ? 0.35 : 0.95,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_RADIUS, 1.4, 10, 36), material);
    ring.position.set(point[0], point[1], point[2]);
    const next = objective.points[index + 1] || objective.points[Math.max(0, index - 1)];
    ring.lookAt(next[0], next[1], next[2]);
    ring.name = `ring-${index}`;
    runner.ringsGroup.add(ring);
  });
}

export function currentObjective(runner) {
  return runner.mission.objectives[runner.objectiveIndex] || null;
}

export function objectiveText(runner) {
  const objective = currentObjective(runner);
  if (!objective) return 'Sortie complete';
  if (objective.type === 'rings') return `${objective.label} — ring ${runner.ringIndex + 1} of ${objective.points.length}`;
  if (objective.type === 'drop') return runner.parcel || runner.dropResult ? 'Parcel away — land at the strip' : `${objective.label} (Space to drop)`;
  return objective.label;
}

/** Distance in metres from the plane to the thing the objective points at. */
export function objectiveDistance(runner, state) {
  const objective = currentObjective(runner);
  if (!objective) return 0;
  if (objective.type === 'rings') {
    const point = objective.points[runner.ringIndex];
    return Math.hypot(state.position.x - point[0], state.position.y - point[1], state.position.z - point[2]);
  }
  if (objective.type === 'drop' && !runner.dropResult) {
    return Math.hypot(state.position.x - objective.zone.x, state.position.z - objective.zone.z);
  }
  const runway = objective.type === 'land' ? objective.runway : runner.mission.objectives[runner.mission.objectives.length - 1].runway;
  return Math.hypot(state.position.x - runway.x, state.position.z - runway.z);
}

/** Release the parcel from the belly pod; it falls and drifts with the plane's motion. */
export function dropParcel(runner, scene, state) {
  if (runner.parcel || runner.dropResult) return false;
  const objective = currentObjective(runner);
  if (!objective || objective.type !== 'drop') return false;
  const group = new THREE.Group();
  const sack = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), new THREE.MeshLambertMaterial({ color: 0xc8a24a }));
  group.add(sack);
  const chute = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.1, 8), new THREE.MeshLambertMaterial({ color: 0xe86a4e }));
  chute.position.y = 1.6;
  group.add(chute);
  group.position.copy(state.position).y -= 1.4;
  scene.add(group);
  runner.parcel = {
    group,
    velocity: new THREE.Vector3(Math.sin(state.heading) * state.speed * 0.82, -1, -Math.cos(state.heading) * state.speed * 0.82),
    landed: false,
  };
  say(runner, 'Parcel away!');
  return true;
}

function updateParcel(runner, world, dt) {
  const parcel = runner.parcel;
  if (!parcel || parcel.landed) return;
  parcel.velocity.y = Math.max(parcel.velocity.y - 3.2 * dt, -7.5); // the chute checks the fall
  parcel.velocity.x *= 1 - 0.25 * dt;
  parcel.velocity.z *= 1 - 0.25 * dt;
  parcel.group.position.addScaledVector(parcel.velocity, dt);
  parcel.group.rotation.y += dt * 0.8;
  const ground = world.groundHeightAt(parcel.group.position.x, parcel.group.position.z);
  if (parcel.group.position.y <= ground + 0.4) {
    parcel.group.position.y = ground + 0.4;
    parcel.landed = true;
    const zone = WORLD.dropZone;
    const distance = Math.hypot(parcel.group.position.x - zone.x, parcel.group.position.z - zone.z);
    if (distance <= zone.radius) {
      runner.dropResult = 'target';
      runner.dropPoints = SCORE.dropOnTarget;
      say(runner, 'Parcel in the circle! Full marks.');
    } else if (distance <= zone.radius * 2.3) {
      runner.dropResult = 'near';
      runner.dropPoints = SCORE.dropNear;
      say(runner, 'Parcel down near the circle — the village can fetch it.');
    } else {
      runner.dropResult = 'lost';
      runner.dropPoints = 0;
      say(runner, 'Parcel lost outside the drop zone.');
    }
    runner.score += runner.dropPoints;
    advanceObjective(runner);
  }
}

function say(runner, text) {
  runner.message = text;
  runner.messageUntil = performance.now() / 1000 + 3.2;
}

/**
 * Per-step mission logic: ring passes, the falling parcel, objective flow.
 * Call after the flight step. `events` carries what the frame produced:
 * { tookOff } — landing is reported separately through onTouchdown.
 */
export function updateMission(runner, state, world, dt) {
  if (runner.finished) return;
  if (!state.onGround) runner.tookOff = true;
  const objective = currentObjective(runner);
  if (objective && objective.type === 'rings') {
    const point = objective.points[runner.ringIndex];
    const distance = Math.hypot(state.position.x - point[0], state.position.y - point[1], state.position.z - point[2]);
    const ringMesh = runner.ringsGroup.children[runner.ringIndex];
    if (ringMesh) {
      const pulse = 1 + Math.sin(performance.now() / 180) * 0.06;
      ringMesh.scale.setScalar(pulse);
    }
    if (distance < RING_RADIUS + 2) {
      runner.ringsFlown += 1;
      runner.score += SCORE.ring;
      runner.ringIndex += 1;
      say(runner, `Ring ${runner.ringsFlown} of ${runner.ringsTotal}`);
      if (runner.ringIndex >= objective.points.length) advanceObjective(runner);
      else buildRingMeshes(runner);
    }
  }
  updateParcel(runner, world, dt);
}

function advanceObjective(runner) {
  runner.objectiveIndex += 1;
  runner.ringIndex = 0;
  buildRingMeshes(runner);
}

/**
 * A touchdown happened (the flight model judged it). If it settles the
 * sortie — the plane stopped on the target runway, or anywhere once it has
 * landed for good — score the landing and finish.
 */
export function onTouchdown(runner, state) {
  const objective = currentObjective(runner);
  const touchdown = state.touchdown;
  if (!touchdown) return;
  const target = runner.mission.objectives[runner.mission.objectives.length - 1].runway;
  if (touchdown.runway === target && objective && objective.type === 'land') {
    const gentleness = Math.max(0, 1 - touchdown.sinkRate / 7);
    const points = Math.round(SCORE.landingBase + SCORE.landingPerfection * gentleness * (0.4 + 0.6 * touchdown.alignment));
    runner.landing = { points, sinkRate: touchdown.sinkRate, runway: target, hard: touchdown.hard, firm: touchdown.firm };
    runner.score += points;
    advanceObjective(runner);
  }
}

/** Has the plane come to a stop after landing at the target? Ends the sortie. */
export function checkSortieEnd(runner, state, elapsedSeconds) {
  if (runner.finished || state.crashed) return;
  if (runner.landing && state.onGround && state.speed < 0.5) {
    runner.finished = true;
    runner.success = !currentObjective(runner);
    const timeBonus = Math.max(0, Math.round((runner.mission.parSeconds - elapsedSeconds) * SCORE.secondBonus));
    if (runner.success) runner.score += timeBonus;
    runner.landing.timeBonus = timeBonus;
    runner.score = Math.max(0, Math.round(runner.score - state.damage * 3));
  }
}

/** Wind for this mission at a moment in time: a steady vector plus gusts. */
export function missionWind(mission, time) {
  const gust = mission.wind.gust * (Math.sin(time * 0.45) + Math.sin(time * 1.63) * 0.6);
  return new THREE.Vector3(mission.wind.x + gust * 0.4, 0, mission.wind.z + gust * 0.25);
}

/** Remove the mission's meshes from the scene (rings, parcel). */
export function disposeMission(runner, scene) {
  scene.remove(runner.ringsGroup);
  if (runner.parcel) scene.remove(runner.parcel.group);
}
