// Synthesised sound, no audio files: a two-oscillator engine whose pitch
// follows the propeller, filtered noise for the wind, and small played
// notes for the events a pilot listens for — a ring flown, a parcel away,
// a touchdown, a crash. Everything is guarded: no AudioContext, no sound,
// and the game plays on unchanged.
export function createAudio() {
  let context = null;
  let engineOsc = null;
  let engineSub = null;
  let engineGain = null;
  let windGain = null;
  let started = false;

  function start() {
    if (started) return;
    started = true;
    try {
      context = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineSub = context.createOscillator();
      engineSub.type = 'sine';
      const engineFilter = context.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineSub.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(context.destination);
      engineOsc.start();
      engineSub.start();

      // Wind: a looped noise buffer through a band-pass.
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const windFilter = context.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 640;
      windFilter.Q.value = 0.6;
      windGain = context.createGain();
      windGain.gain.value = 0;
      noise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(context.destination);
      noise.start();
    } catch (error) {
      context = null;
    }
  }

  function tone(freq, seconds, type, volume, when) {
    if (!context) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const startAt = context.currentTime + (when || 0);
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(volume || 0.12, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + seconds);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(startAt);
    osc.stop(startAt + seconds + 0.05);
  }

  return {
    start,
    /** Continuous engine and wind, following the flight state. */
    update(state) {
      if (!context || !engineGain) return;
      const rpm = state.engineDead || state.crashed ? 0 : 26 + state.throttle * 58 + state.speed * 0.35;
      engineOsc.frequency.value = rpm;
      engineSub.frequency.value = rpm / 2;
      engineGain.gain.value = state.crashed ? 0 : 0.028 + state.throttle * 0.05;
      windGain.gain.value = Math.min(0.16, state.speed * state.speed * 0.000028);
    },
    ringChime() {
      tone(880, 0.35, 'sine', 0.14);
      tone(1318, 0.5, 'sine', 0.12, 0.09);
    },
    dropAway() {
      tone(520, 0.3, 'triangle', 0.12);
      tone(392, 0.45, 'triangle', 0.1, 0.1);
    },
    touchdown(hard) {
      tone(hard ? 90 : 120, 0.25, 'sine', 0.22);
      if (hard) tone(64, 0.5, 'square', 0.1, 0.03);
    },
    crash() {
      tone(70, 0.9, 'sawtooth', 0.2);
      tone(48, 1.2, 'square', 0.12, 0.05);
    },
    success() {
      tone(659, 0.3, 'sine', 0.12);
      tone(880, 0.3, 'sine', 0.12, 0.14);
      tone(1108, 0.55, 'sine', 0.12, 0.28);
    },
  };
}
