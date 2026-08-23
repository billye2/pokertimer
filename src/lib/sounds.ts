/**
 * Synthesized alert sounds via Web Audio — no asset files, works offline.
 * Call `unlockAudio()` from a user gesture (e.g. pressing Start) so alerts
 * can fire later without interaction.
 */

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function unlockAudio(): void {
  const c = audioCtx();
  if (c && c.state === "suspended") void c.resume();
}

function tone(
  c: AudioContext,
  freq: number,
  startAt: number,
  durationSec: number,
  gainValue = 0.18
): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(gainValue, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + durationSec);
  osc.connect(gain).connect(c.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.05);
}

/** Two-tone rising chime — new level. */
export function playLevelUp(): void {
  const c = audioCtx();
  if (!c) return;
  const t = c.currentTime;
  tone(c, 660, t, 0.35);
  tone(c, 880, t + 0.18, 0.5);
}

/** Single short beep — one minute remaining. */
export function playOneMinute(): void {
  const c = audioCtx();
  if (!c) return;
  tone(c, 740, c.currentTime, 0.25, 0.14);
}

/** Three-tone descending chime — break time. */
export function playBreak(): void {
  const c = audioCtx();
  if (!c) return;
  const t = c.currentTime;
  tone(c, 880, t, 0.3);
  tone(c, 740, t + 0.2, 0.3);
  tone(c, 587, t + 0.4, 0.6);
}
