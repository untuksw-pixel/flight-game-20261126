// Keyboard and mouse control state.
// One object the whole game reads: stick axes in -1..1, throttle as a held
// value the player raises and lowers, and one-shot flags for the keys that
// trigger an action (drop, camera, pause) which the game consumes and clears.

export function createInput() {
  const input = {
    pitch: 0, // -1 nose down .. 1 nose up (smoothed from the keys/mouse)
    roll: 0, // -1 bank left .. 1 bank right
    throttleDelta: 0, // -1..1 while W/S or the wheel are asking for a change
    brake: false,
    dropPressed: false,
    cameraPressed: false,
    pausePressed: false,
    anyKeyPressed: false,
    mouseSteering: false, // follows the pointer while the button is held
  };

  const held = new Set();
  let mouseX = 0;
  let mouseY = 0;
  let mouseHeld = false;

  function axis() {
    let pitch = 0;
    let roll = 0;
    if (held.has('ArrowUp')) pitch -= 1; // stick forward: nose down
    if (held.has('ArrowDown')) pitch += 1; // stick back: nose up
    if (held.has('ArrowLeft')) roll -= 1;
    if (held.has('ArrowRight')) roll += 1;
    if (mouseHeld) {
      // The pointer steers like a stick held where the hand rests: right of
      // centre banks right, below centre pulls the nose up.
      roll += mouseX * 1.4;
      pitch += mouseY * 1.2;
    }
    input.pitch = Math.max(-1, Math.min(1, pitch));
    input.roll = Math.max(-1, Math.min(1, roll));
    let delta = 0;
    if (held.has('KeyW')) delta += 1;
    if (held.has('KeyS')) delta -= 1;
    input.throttleDelta = delta;
    input.brake = held.has('KeyB');
    input.mouseSteering = mouseHeld;
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    held.add(event.code);
    input.anyKeyPressed = true;
    if (event.code === 'Space') input.dropPressed = true;
    if (event.code === 'KeyC') input.cameraPressed = true;
    if (event.code === 'KeyP' || event.code === 'Escape') input.pausePressed = true;
    axis();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
    axis();
  });
  window.addEventListener('pointermove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = (event.clientY / window.innerHeight) * 2 - 1;
  });
  window.addEventListener('pointerdown', (event) => {
    if (event.target === document.body || event.target.tagName === 'CANVAS') {
      mouseHeld = true;
      input.anyKeyPressed = true;
      axis();
    }
  });
  window.addEventListener('pointerup', () => {
    mouseHeld = false;
    axis();
  });
  window.addEventListener('wheel', (event) => {
    // The wheel trims the throttle directly; main.js reads and clears this.
    input.wheelSteps = (input.wheelSteps || 0) + (event.deltaY < 0 ? 1 : -1);
  }, { passive: true });
  window.addEventListener('blur', () => {
    held.clear();
    mouseHeld = false;
    axis();
  });

  return input;
}

/** Read a one-shot flag and clear it, so an action fires exactly once. */
export function consume(input, flag) {
  const value = Boolean(input[flag]);
  input[flag] = false;
  return value;
}
