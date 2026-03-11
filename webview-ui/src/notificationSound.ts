import {
  ERROR_NOTE_1_HZ,
  ERROR_NOTE_2_HZ,
  ERROR_NOTE_DURATION_SEC,
  ERROR_VOLUME,
  NOTIFICATION_NOTE_1_HZ,
  NOTIFICATION_NOTE_1_START_SEC,
  NOTIFICATION_NOTE_2_HZ,
  NOTIFICATION_NOTE_2_START_SEC,
  NOTIFICATION_NOTE_DURATION_SEC,
  NOTIFICATION_VOLUME,
  SUCCESS_NOTE_1_HZ,
  SUCCESS_NOTE_2_HZ,
  SUCCESS_NOTE_3_HZ,
  SUCCESS_NOTE_DURATION_SEC,
  SUCCESS_VOLUME,
  TYPING_NOTE_DURATION_SEC,
  TYPING_NOTE_HZ,
  TYPING_VOLUME,
} from './constants.js';

let soundEnabled = true;
let typingSoundEnabled = true;
let notificationSoundEnabled = true;
let masterVolume = 1.0;
let audioCtx: AudioContext | null = null;

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setTypingSoundEnabled(enabled: boolean): void {
  typingSoundEnabled = enabled;
}

export function isTypingSoundEnabled(): boolean {
  return typingSoundEnabled;
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  notificationSoundEnabled = enabled;
}

export function isNotificationSoundEnabled(): boolean {
  return notificationSoundEnabled;
}

export function setMasterVolume(volume: number): void {
  masterVolume = Math.max(0, Math.min(1, volume));
}

export function getMasterVolume(): number {
  return masterVolume;
}

function getCtx(): AudioContext | null {
  if (!soundEnabled) return null;
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function playNote(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  volume: number,
): void {
  const t = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);

  const vol = volume * masterVolume;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + duration);
}

/** Ascending two-note chime (waiting/done notification) */
export async function playDoneSound(): Promise<void> {
  if (!notificationSoundEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') await ctx.resume();
    playNote(
      ctx,
      NOTIFICATION_NOTE_1_HZ,
      NOTIFICATION_NOTE_1_START_SEC,
      NOTIFICATION_NOTE_DURATION_SEC,
      NOTIFICATION_VOLUME,
    );
    playNote(
      ctx,
      NOTIFICATION_NOTE_2_HZ,
      NOTIFICATION_NOTE_2_START_SEC,
      NOTIFICATION_NOTE_DURATION_SEC,
      NOTIFICATION_VOLUME,
    );
  } catch {
    // Audio may not be available
  }
}

/** Descending two-note (error notification) */
export function playErrorSound(): void {
  if (!notificationSoundEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    playNote(ctx, ERROR_NOTE_1_HZ, 0, ERROR_NOTE_DURATION_SEC, ERROR_VOLUME);
    playNote(ctx, ERROR_NOTE_2_HZ, 0.12, ERROR_NOTE_DURATION_SEC, ERROR_VOLUME);
  } catch {
    // ignore
  }
}

/** Ascending three-note (success/task complete) */
export function playSuccessSound(): void {
  if (!notificationSoundEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    playNote(ctx, SUCCESS_NOTE_1_HZ, 0, SUCCESS_NOTE_DURATION_SEC, SUCCESS_VOLUME);
    playNote(ctx, SUCCESS_NOTE_2_HZ, 0.08, SUCCESS_NOTE_DURATION_SEC, SUCCESS_VOLUME);
    playNote(ctx, SUCCESS_NOTE_3_HZ, 0.16, SUCCESS_NOTE_DURATION_SEC, SUCCESS_VOLUME);
  } catch {
    // ignore
  }
}

/** Short click (typing sound, low volume) */
export function playTypingSound(): void {
  if (!typingSoundEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(TYPING_NOTE_HZ, t);

    const vol = TYPING_VOLUME * masterVolume;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + TYPING_NOTE_DURATION_SEC);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + TYPING_NOTE_DURATION_SEC);
  } catch {
    // ignore
  }
}

/** Call from any user-gesture handler to ensure AudioContext is unlocked */
export function unlockAudio(): void {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch {
    // ignore
  }
}
