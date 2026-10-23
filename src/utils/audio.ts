/**
 * APARAJITA Audio Synthesis Engine
 * Uses Web Audio API to create authentic emergency sirens, ringtones, and countdown clicks.
 */

let audioCtx: AudioContext | null = null;
let sirenOscillator: OscillatorNode | null = null;
let sirenGain: GainNode | null = null;
let sirenInterval: ReturnType<typeof setInterval> | null = null;

let ringtoneOscillator: OscillatorNode | null = null;
let ringtoneGain: GainNode | null = null;
let ringtoneInterval: ReturnType<typeof setInterval> | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Starts a realistic 2-tone emergency police/safety siren alarm.
 */
export function startEmergencySiren(): void {
  try {
    stopEmergencySiren();
    const ctx = getAudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.35, ctx.currentTime);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    let high = false;
    sirenInterval = setInterval(() => {
      if (!audioCtx) return;
      const targetFreq = high ? 960 : 720;
      osc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.08);
      high = !high;
    }, 380);

    sirenOscillator = osc;
    sirenGain = gain;
  } catch (err) {
    console.warn('Emergency siren audio could not start:', err);
  }
}

/**
 * Stops the active siren.
 */
export function stopEmergencySiren(): void {
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }
  if (sirenOscillator) {
    try {
      sirenOscillator.stop();
      sirenOscillator.disconnect();
    } catch {
      // ignore
    }
    sirenOscillator = null;
  }
  if (sirenGain) {
    try {
      sirenGain.disconnect();
    } catch {
      // ignore
    }
    sirenGain = null;
  }
}

/**
 * Plays a discrete tick / countdown beep.
 */
export function playCountdownBeep(isFinal = false): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isFinal ? 1200 : 880, ctx.currentTime);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isFinal ? 0.35 : 0.15));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + (isFinal ? 0.35 : 0.15));
  } catch {
    // Audio context may require user gesture
  }
}

/**
 * Plays a phone ringtone for the Decoy Fake Call escape feature.
 */
export function startPhoneRingtone(): void {
  try {
    stopPhoneRingtone();
    const ctx = getAudioContext();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    // Standard phone ringing pair: 440Hz + 480Hz
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, ctx.currentTime);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(480, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();

    let ringing = true;
    const ringCycle = () => {
      if (!audioCtx) return;
      if (ringing) {
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        setTimeout(() => {
          if (audioCtx) gain.gain.setValueAtTime(0, ctx.currentTime);
        }, 1800);
      }
      ringing = !ringing;
    };

    ringCycle();
    ringtoneInterval = setInterval(ringCycle, 3500);

    ringtoneOscillator = osc1;
    ringtoneGain = gain;
  } catch (err) {
    console.warn('Fake call ringtone error:', err);
  }
}

/**
 * Stops the phone ringtone.
 */
export function stopPhoneRingtone(): void {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (ringtoneOscillator) {
    try {
      ringtoneOscillator.stop();
      ringtoneOscillator.disconnect();
    } catch {
      // ignore
    }
    ringtoneOscillator = null;
  }
  if (ringtoneGain) {
    try {
      ringtoneGain.disconnect();
    } catch {
      // ignore
    }
    ringtoneGain = null;
  }
}
