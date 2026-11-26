// Kestrel Post — Island Mail Run: the game's entry point.
// Wires the world, the plane, the flight model, the missions, the
// instruments and the menus together, and runs the frame loop. Everything
// with a job of its own lives in its own file; this one only conducts.
import { WORLD } from './config.js';
import { consume, createInput } from './input.js';
import { createFlightState, stepFlight } from './flight-model.js';
import { buildAircraft } from './aircraft.js';
import { buildWorld, groundHeightAt, runwayAt } from './terrain.js';
import { buildClouds, buildSky } from './sky.js';
import {
  MISSIONS, checkSortieEnd, createMissionRunner, disposeMission, dropParcel,
  missionWind, onTouchdown, updateMission,
} from './missions.js';
import { drawInstruments } from './instruments.js';
import { drawHud } from './hud.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('scene');
const panel = document.getElementById('panel');
const panelCtx = panel.getContext('2d');
const menuEl = document.getElementById('menu');
const statusEl = document.getElementById('status');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 20000);

buildSky(scene);
const clouds = buildClouds(scene, 42);
buildWorld(scene);
const aircraft = buildAircraft();
scene.add(aircraft.group);
const input = createInput();
const audio = createAudio();

const HOME = WORLD.homeRunway;
function runwaySpawn() {
  return { x: HOME.x, y: HOME.elevation + 1.6, z: HOME.z + HOME.length / 2 - 70, heading: 0 };
}

const game = {
  state: createFlightState(runwaySpawn()),
  runner: null,
  input,
  mode: 'menu', // menu | flying | paused | debrief
  view: 'chase', // chase | cockpit
  elapsed: 0,
  chosenMission: 0,
  frozen: false, // screenshot scenes freeze the world once staged
  cameraPos: new THREE.Vector3(HOME.x - 14, HOME.elevation + 7, HOME.z + HOME.length / 2 - 30),
  step,
  startMission,
  spawnAirborne,
  setView,
};

const world = {
  groundHeightAt,
  runwayAt,
  windAt: (time) => (game.runner ? missionWind(game.runner.mission, time) : new THREE.Vector3(1.5, 0, 0.5)),
};

function setView(view) {
  game.view = view;
  aircraft.canopy.visible = view !== 'cockpit';
  aircraft.cockpitDeck.visible = view === 'cockpit';
  aircraft.setCockpitView(view === 'cockpit');
}

function startMission(index) {
  if (game.runner) disposeMission(game.runner, scene);
  game.chosenMission = index;
  const mission = MISSIONS[index];
  game.state = createFlightState(runwaySpawn());
  game.state.fuel = mission.fuel;
  game.runner = createMissionRunner(scene, mission);
  game.elapsed = 0;
  game.mode = 'flying';
  setView('chase');
  menuEl.style.display = 'none';
  statusEl.textContent = `${mission.title}: ${mission.briefing}`;
}

function spawnAirborne(position, heading, speed) {
  game.state.position.set(position.x, position.y, position.z);
  game.state.heading = heading;
  game.state.speed = speed;
  game.state.pitch = 0;
  game.state.roll = 0;
  game.state.onGround = false;
  game.state.throttle = 0.55;
}

let lastRingCount = 0;

/** One fixed simulation step: flight, mission flow, and the events they raise. */
function step(dt) {
  const state = game.state;
  const runner = game.runner;
  stepFlight(state, input, world, dt, game.elapsed);
  if (runner) {
    if (state.touchdown) {
      audio.touchdown(Boolean(state.touchdown.hard));
      onTouchdown(runner, state);
    }
    updateMission(runner, state, world, dt);
    if (runner.ringsFlown !== lastRingCount) {
      lastRingCount = runner.ringsFlown;
      audio.ringChime();
    }
    if (consume(input, 'dropPressed') && dropParcel(runner, scene, state)) audio.dropAway();
    checkSortieEnd(runner, state, game.elapsed);
    if (runner.finished && game.mode === 'flying') endSortie();
  }
  if (state.crashed && game.mode === 'flying') {
    audio.crash();
    endSortie();
  }
}

function endSortie() {
  game.mode = 'debrief';
  const { state, runner } = game;
  if (!state.crashed && runner && runner.success) audio.success();
  showDebrief();
}

// ---------------------------------------------------------------------------
// Menus (DOM, mouse-clickable; the canvas keeps the world turning behind).

function el(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.firstElementChild;
}

function showMenu() {
  game.mode = 'menu';
  // Park a fresh plane at the field for the menu backdrop, whatever state
  // the last sortie ended in.
  if (game.runner) {
    disposeMission(game.runner, scene);
    game.runner = null;
  }
  game.state = createFlightState(runwaySpawn());
  setView('chase');
  menuEl.style.display = 'flex';
  menuEl.innerHTML = '';
  const card = el(`<div class="card">
    <h1>KESTREL POST</h1>
    <h2>Island Mail Run</h2>
    <p>The mail must get through. Fly the little Kestrel seaplane's land-bound cousin out of Kestrel Field:
    thread the harbour rings, drop parcels where the villages wait, and land like the post is watching —
    because it is. Fuel burns, weather pushes, and rough arrivals bend the airframe.</p>
    <div class="missions"></div>
    <button class="fly">FLY THE MAIL</button>
    <p class="keys"><span>Arrows</span> or <span>hold the mouse</span> to fly · <span>W/S</span> or <span>wheel</span> throttle ·
    <span>B</span> brake · <span>Space</span> drop parcel · <span>C</span> cockpit view · <span>P</span> pause</p>
  </div>`);
  const list = card.querySelector('.missions');
  MISSIONS.forEach((mission, index) => {
    const button = el(`<button><b>${index + 1}. ${mission.title}</b> — ${mission.briefing}</button>`);
    if (index === game.chosenMission) button.classList.add('chosen');
    button.addEventListener('click', () => {
      game.chosenMission = index;
      list.querySelectorAll('button').forEach((b) => b.classList.remove('chosen'));
      button.classList.add('chosen');
    });
    list.appendChild(button);
  });
  card.querySelector('.fly').addEventListener('click', () => {
    audio.start();
    startMission(game.chosenMission);
  });
  menuEl.appendChild(card);
  statusEl.textContent = 'Kestrel Post: choose a mission and fly the mail.';
}

function showDebrief() {
  const { state, runner } = game;
  menuEl.style.display = 'flex';
  menuEl.innerHTML = '';
  let headline;
  let story;
  if (state.crashed) {
    headline = 'THE MAIL DID NOT GET THROUGH';
    story = state.crashReason;
  } else if (runner.success) {
    headline = 'MAIL DELIVERED';
    story = ` down at ${runner.landing.runway.name} at a sink rate of ${runner.landing.sinkRate.toFixed(1)} m/s` +
      `${runner.landing.hard ? ' — a hard arrival that bent the gear' : runner.landing.firm ? ' — a firm arrival' : ' — a gentle arrival'}.`;
    story = `Touched${story}`;
  } else {
    headline = 'DOWN, BUT THE JOB IS UNFINISHED';
    story = 'The plane is on the ground, but the sortie objectives were not all met. Fly the full job to score.';
  }
  const rows = [
    [`Rings flown (${runner.ringsFlown} of ${runner.ringsTotal})`, runner.ringsFlown * 150],
    ['Parcel drop', runner.dropPoints],
    ['Landing', runner.landing ? runner.landing.points : 0],
    ['Time bonus', runner.landing ? runner.landing.timeBonus || 0 : 0],
    ['Damage penalty', -Math.round(state.damage * 3)],
  ];
  const card = el(`<div class="card">
    <h1 style="font-size:26px">${headline}</h1>
    <h2>${runner.mission.title}</h2>
    <p>${story}</p>
    <p>${rows.map(([label, value]) => `${label}: <b>${value}</b>`).join('<br>')}</p>
    <p style="font-size:20px">Final score: <b style="color:#f6d67c">${state.crashed ? 0 : runner.score}</b></p>
    <div class="missions">
      <button class="fly">FLY IT AGAIN</button>
      <button class="back">MISSION SELECT</button>
    </div>
  </div>`);
  if (state.crashed) runner.score = 0;
  card.querySelector('.fly').addEventListener('click', () => startMission(game.chosenMission));
  card.querySelector('.back').addEventListener('click', showMenu);
  menuEl.appendChild(card);
  statusEl.textContent = `${headline}. Final score ${runner.score}.`;
}

function showPause() {
  menuEl.style.display = 'flex';
  menuEl.innerHTML = '';
  const card = el(`<div class="card">
    <h1 style="font-size:26px">PAUSED</h1>
    <p>The Kestrel waits, engine ticking over.</p>
    <div class="missions">
      <button class="fly">RESUME</button>
      <button class="restart">RESTART SORTIE</button>
      <button class="back">MISSION SELECT</button>
    </div>
  </div>`);
  card.querySelector('.fly').addEventListener('click', () => {
    game.mode = 'flying';
    menuEl.style.display = 'none';
  });
  card.querySelector('.restart').addEventListener('click', () => startMission(game.chosenMission));
  card.querySelector('.back').addEventListener('click', showMenu);
  menuEl.appendChild(card);
}

// ---------------------------------------------------------------------------
// Camera: a chase view that lags softly behind the tail and never rolls with
// the plane, and a cockpit view over the cowling.

const _fwd = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _look = new THREE.Vector3();

function updateCamera(dt, time) {
  const state = game.state;
  if (game.mode === 'menu') {
    // A slow orbit of the field, the plane parked by the tower.
    const angle = time * 0.05;
    camera.position.set(HOME.x + Math.sin(angle) * 55, HOME.elevation + 16, HOME.z + 120 + Math.cos(angle) * 55);
    camera.lookAt(state.position.x, state.position.y + 2, state.position.z);
    return;
  }
  if (game.view === 'cockpit') {
    _fwd.set(Math.sin(state.heading) * Math.cos(state.pitch), Math.sin(state.pitch), -Math.cos(state.heading) * Math.cos(state.pitch));
    camera.position.copy(state.position).addScaledVector(_fwd, 0.9);
    camera.position.y += 1.5;
    _look.copy(camera.position).addScaledVector(_fwd, 60);
    _look.y -= 4.6;
    camera.lookAt(_look);
    camera.rotation.z += state.roll * 0.35; // a hint of the bank, not all of it
    return;
  }
  // Chase: behind and above, positioned by heading alone so the horizon
  // stays level while the plane banks beneath the camera.
  _fwd.set(Math.sin(state.heading), 0, -Math.cos(state.heading));
  _desired.copy(state.position).addScaledVector(_fwd, -12.5);
  _desired.y += 4.4;
  const groundClear = groundHeightAt(_desired.x, _desired.z) + 2.2;
  if (_desired.y < groundClear) _desired.y = groundClear;
  const blend = game.frozen ? 1 : 1 - Math.exp(-dt * 3.6);
  game.cameraPos.lerp(_desired, blend);
  camera.position.copy(game.cameraPos);
  _look.copy(state.position).addScaledVector(_fwd, 14);
  _look.y += 1.2;
  camera.lookAt(_look);
}

// ---------------------------------------------------------------------------
// Frame loop.

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  panel.width = width;
  panel.height = height;
}
window.addEventListener('resize', resize);
resize();

// Screenshot mode: stage the scene with the autopilot, then freeze the
// simulation and keep rendering the staged frame.
const shotName = new URLSearchParams(window.location.search).get('shot');
if (shotName) {
  game.frozen = true;
  const staged = stageShot(game, shotName);
  statusEl.textContent = `Kestrel Post screenshot scene: ${staged}.`;
  menuEl.style.display = 'none';
  game.mode = 'flying';
}

let lastTime = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  const time = now / 1000;

  if (!game.frozen && game.mode === 'flying') {
    game.elapsed += dt;
    // Fixed-step the simulation so the physics never depends on frame rate.
    let remaining = dt;
    while (remaining > 0) {
      const slice = Math.min(remaining, 1 / 60);
      step(slice);
      remaining -= slice;
      if (game.mode !== 'flying') break;
    }
    if (consume(input, 'cameraPressed')) setView(game.view === 'chase' ? 'cockpit' : 'chase');
    if (consume(input, 'pausePressed')) {
      game.mode = 'paused';
      showPause();
    }
  } else if (game.mode === 'paused' && consume(input, 'pausePressed')) {
    game.mode = 'flying';
    menuEl.style.display = 'none';
  }

  aircraft.update(game.state, input, dt, time);
  clouds.update(dt, world.windAt(time));
  updateCamera(dt, time);
  audio.update(game.state);
  renderer.render(scene, camera);

  panelCtx.clearRect(0, 0, panel.width, panel.height);
  if (game.mode !== 'menu') {
    drawHud(panelCtx, { state: game.state, runner: game.runner, elapsed: game.elapsed, cameraMode: game.view }, panel.width, panel.height);
    drawInstruments(panelCtx, game.state, panel.width, panel.height);
  }
}
requestAnimationFrame(frame);

if (!shotName) showMenu();
