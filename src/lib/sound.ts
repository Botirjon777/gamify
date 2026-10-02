"use client";

import { useSyncExternalStore } from "react";

/**
 * Sound effects, synthesized with the Web Audio API — no audio files to download.
 * On by default; the switch (settings, drill header) is remembered on this device.
 */
export type SoundName = "tap" | "correct" | "wrong" | "levelUp" | "complete" | "win" | "lose" | "tick" | "go" | "claim" | "move" | "capture";

interface Note {
  /** Frequency in Hz; glides to `to` when given. */
  f: number;
  to?: number;
  /** Start, seconds from the beginning of the effect. */
  at: number;
  dur: number;
  type?: OscillatorType;
  /** Loudness 0–1 (before the master volume). */
  gain?: number;
}

// Notes: C4 262 · E4 330 · G4 392 · C5 523 · E5 659 · G5 784 · B5 988 · C6 1047 · E6 1319
const SOUNDS: Record<SoundName, Note[]> = {
  tap: [{ f: 620, at: 0, dur: 0.05, gain: 0.5 }],
  correct: [
    { f: 659, at: 0, dur: 0.12 },
    { f: 988, at: 0.09, dur: 0.24 },
  ],
  wrong: [
    { f: 220, to: 185, at: 0, dur: 0.16, type: "sawtooth", gain: 0.3 },
    { f: 165, to: 130, at: 0.13, dur: 0.3, type: "sawtooth", gain: 0.3 },
  ],
  levelUp: [
    { f: 523, at: 0, dur: 0.14 },
    { f: 659, at: 0.1, dur: 0.14 },
    { f: 784, at: 0.2, dur: 0.14 },
    { f: 1047, at: 0.3, dur: 0.5 },
  ],
  complete: [
    { f: 392, at: 0, dur: 0.14 },
    { f: 523, at: 0.11, dur: 0.14 },
    { f: 659, at: 0.22, dur: 0.14 },
    { f: 784, at: 0.33, dur: 0.6 },
    { f: 1047, at: 0.33, dur: 0.6, gain: 0.6 },
  ],
  win: [
    { f: 523, at: 0, dur: 0.12 },
    { f: 659, at: 0.1, dur: 0.12 },
    { f: 784, at: 0.2, dur: 0.12 },
    { f: 1047, at: 0.32, dur: 0.7 },
    { f: 1319, at: 0.32, dur: 0.7, gain: 0.5 },
  ],
  lose: [
    { f: 330, at: 0, dur: 0.25, type: "triangle" },
    { f: 294, at: 0.22, dur: 0.25, type: "triangle" },
    { f: 262, at: 0.44, dur: 0.6, type: "triangle" },
  ],
  tick: [{ f: 880, at: 0, dur: 0.04, gain: 0.35 }],
  go: [{ f: 1175, at: 0, dur: 0.3 }],
  claim: [
    { f: 988, at: 0, dur: 0.08 },
    { f: 1319, at: 0.07, dur: 0.35 },
  ],
  // Chess: a piece put down on the board; a capture knocks twice.
  move: [{ f: 190, to: 90, at: 0, dur: 0.07, type: "triangle", gain: 1.6 }],
  capture: [
    { f: 260, to: 120, at: 0, dur: 0.05, type: "triangle", gain: 1.6 },
    { f: 170, to: 80, at: 0.05, dur: 0.08, type: "triangle", gain: 1.6 },
  ],
};

const MASTER_VOLUME = 0.16;
const STORAGE_KEY = "zk-sound";

// ─── Setting (per device) ───────────────────────────────────────────────────

let enabled: boolean | null = null;
const listeners = new Set<() => void>();

function isEnabled(): boolean {
  if (enabled === null) {
    try {
      enabled = localStorage.getItem(STORAGE_KEY) !== "off";
    } catch {
      enabled = true; // storage blocked (private mode): sounds stay on for this visit
    }
  }
  return enabled;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // not remembered, still applies now
  }
  listeners.forEach((notify) => notify());
}

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => void listeners.delete(notify);
};

/** Are sound effects on? (The server and the first client render assume "on".) */
export const useSoundEnabled = () => useSyncExternalStore(subscribe, isEnabled, () => true);

// ─── Playing ────────────────────────────────────────────────────────────────

let context: AudioContext | null = null;

/** Play an effect. Silent when sounds are off, and never throws (audio is a nicety, not a feature to break on). */
export function playSound(name: SoundName) {
  if (typeof window === "undefined" || !isEnabled()) return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    context ??= new Ctor();
    // Browsers start the context suspended until the user has interacted with the page.
    if (context.state === "suspended") void context.resume();

    const start = context.currentTime + 0.01;
    for (const note of SOUNDS[name]) {
      const oscillator = context.createOscillator();
      const volume = context.createGain();
      const at = start + note.at;
      oscillator.type = note.type ?? "sine";
      oscillator.frequency.setValueAtTime(note.f, at);
      if (note.to) oscillator.frequency.linearRampToValueAtTime(note.to, at + note.dur);
      // Quick attack, smooth fade — no clicks.
      volume.gain.setValueAtTime(0.0001, at);
      volume.gain.exponentialRampToValueAtTime((note.gain ?? 1) * MASTER_VOLUME, at + 0.012);
      volume.gain.exponentialRampToValueAtTime(0.0001, at + note.dur);
      oscillator.connect(volume).connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + note.dur + 0.02);
    }
  } catch {
    // no audio device, context limit reached, …
  }
}
