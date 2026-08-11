"use client";

export type SoundTheme = "soft" | "retro" | "marimba" | "minimal" | "piano" | "bells" | "scifi" | "drum";
export type SoundVolume = "low" | "normal" | "loud";

type Note = { freq: number; duration: number; delay?: number; type?: OscillatorType; volume?: number };
export type SoundKind = "click" | "notify" | "roundEnd" | "error" | "success";

const VOLUME_LEVELS: Record<SoundVolume, number> = { low: 0.2, normal: 0.4, loud: 0.8 };

export const SOUND_VOLUME_LABELS: Record<SoundVolume, string> = { low: "เบา", normal: "ปกติ", loud: "ดัง" };

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function playNotes(notes: Note[], masterVolume = 0.18) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  notes.forEach((n) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.value = n.freq;
    const start = now + (n.delay ?? 0);
    const vol = (n.volume ?? 1) * masterVolume;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + n.duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + n.duration + 0.02);
  });
}

const PACKS: Record<SoundTheme, Record<SoundKind, Note[]>> = {
  soft: {
    click: [{ freq: 620, duration: 0.09, type: "sine" }],
    notify: [
      { freq: 780, duration: 0.12, type: "sine" },
      { freq: 1040, duration: 0.14, type: "sine", delay: 0.09, volume: 0.85 },
    ],
    roundEnd: [
      { freq: 523.25, duration: 0.22, type: "sine" },
      { freq: 659.25, duration: 0.22, type: "sine", delay: 0.14 },
      { freq: 783.99, duration: 0.34, type: "sine", delay: 0.28 },
    ],
    // Low frequencies below ~300Hz barely reproduce on small phone speakers, so this
    // stays "low" only relative to the other sounds (which all sit at 440Hz+), not in
    // absolute terms — otherwise it's inaudible on exactly the devices this app targets.
    error: [
      { freq: 340, duration: 0.14, type: "sine", volume: 1 },
      { freq: 340, duration: 0.14, type: "sine", delay: 0.19, volume: 1 },
    ],
    success: [
      { freq: 659.25, duration: 0.09, type: "sine", volume: 0.8 },
      { freq: 880, duration: 0.09, type: "sine", delay: 0.08, volume: 0.8 },
      { freq: 1174.66, duration: 0.16, type: "sine", delay: 0.16, volume: 0.9 },
    ],
  },
  retro: {
    click: [{ freq: 440, duration: 0.06, type: "square", volume: 0.55 }],
    notify: [
      { freq: 988, duration: 0.08, type: "square", volume: 0.55 },
      { freq: 1319, duration: 0.12, type: "square", delay: 0.07, volume: 0.5 },
    ],
    roundEnd: [
      { freq: 523.25, duration: 0.11, type: "square", volume: 0.5 },
      { freq: 659.25, duration: 0.11, type: "square", delay: 0.1, volume: 0.5 },
      { freq: 783.99, duration: 0.11, type: "square", delay: 0.2, volume: 0.5 },
      { freq: 1046.5, duration: 0.22, type: "square", delay: 0.3, volume: 0.5 },
    ],
    error: [
      { freq: 300, duration: 0.12, type: "square", volume: 1 },
      { freq: 300, duration: 0.12, type: "square", delay: 0.17, volume: 1 },
    ],
    success: [
      { freq: 523.25, duration: 0.06, type: "square", volume: 0.5 },
      { freq: 659.25, duration: 0.06, type: "square", delay: 0.06, volume: 0.5 },
      { freq: 1046.5, duration: 0.12, type: "square", delay: 0.12, volume: 0.55 },
    ],
  },
  marimba: {
    click: [{ freq: 300, duration: 0.14, type: "triangle" }],
    notify: [
      { freq: 494, duration: 0.16, type: "triangle" },
      { freq: 659.25, duration: 0.2, type: "triangle", delay: 0.1, volume: 0.85 },
    ],
    roundEnd: [
      { freq: 392, duration: 0.24, type: "triangle" },
      { freq: 523.25, duration: 0.24, type: "triangle", delay: 0.15 },
      { freq: 659.25, duration: 0.36, type: "triangle", delay: 0.3 },
    ],
    error: [
      { freq: 320, duration: 0.16, type: "triangle", volume: 1 },
      { freq: 320, duration: 0.16, type: "triangle", delay: 0.21, volume: 1 },
    ],
    success: [
      { freq: 392, duration: 0.12, type: "triangle", volume: 0.85 },
      { freq: 523.25, duration: 0.12, type: "triangle", delay: 0.1, volume: 0.85 },
      { freq: 659.25, duration: 0.2, type: "triangle", delay: 0.2, volume: 0.9 },
    ],
  },
  minimal: {
    click: [{ freq: 1200, duration: 0.035, type: "sine", volume: 0.5 }],
    notify: [{ freq: 1000, duration: 0.1, type: "sine", volume: 0.55 }],
    roundEnd: [
      { freq: 880, duration: 0.14, type: "sine", volume: 0.6 },
      { freq: 1174.66, duration: 0.2, type: "sine", delay: 0.12, volume: 0.6 },
    ],
    error: [
      { freq: 360, duration: 0.1, type: "sine", volume: 0.95 },
      { freq: 360, duration: 0.1, type: "sine", delay: 0.14, volume: 0.95 },
    ],
    success: [
      { freq: 880, duration: 0.05, type: "sine", volume: 0.55 },
      { freq: 1046.5, duration: 0.05, type: "sine", delay: 0.06, volume: 0.55 },
      { freq: 1318.5, duration: 0.08, type: "sine", delay: 0.12, volume: 0.6 },
    ],
  },
  piano: {
    click: [{ freq: 523.25, duration: 0.16, type: "sine", volume: 0.8 }],
    notify: [
      { freq: 659.25, duration: 0.2, type: "sine", volume: 0.8 },
      { freq: 523.25, duration: 0.26, type: "sine", delay: 0.12, volume: 0.7 },
    ],
    roundEnd: [
      { freq: 523.25, duration: 0.3, type: "sine" },
      { freq: 659.25, duration: 0.3, type: "sine", delay: 0.16 },
      { freq: 783.99, duration: 0.3, type: "sine", delay: 0.32 },
      { freq: 1046.5, duration: 0.5, type: "sine", delay: 0.48 },
    ],
    error: [
      { freq: 349.23, duration: 0.18, type: "sine", volume: 1 },
      { freq: 349.23, duration: 0.18, type: "sine", delay: 0.24, volume: 1 },
    ],
    success: [
      { freq: 523.25, duration: 0.14, type: "sine", volume: 0.85 },
      { freq: 659.25, duration: 0.14, type: "sine", delay: 0.11, volume: 0.85 },
      { freq: 880, duration: 0.22, type: "sine", delay: 0.22, volume: 0.9 },
    ],
  },
  bells: {
    click: [{ freq: 1567.98, duration: 0.1, type: "sine", volume: 0.6 }],
    notify: [
      { freq: 1318.5, duration: 0.28, type: "sine", volume: 0.7 },
      { freq: 1760, duration: 0.34, type: "sine", delay: 0.1, volume: 0.65 },
    ],
    roundEnd: [
      { freq: 1046.5, duration: 0.4, type: "sine", volume: 0.75 },
      { freq: 1318.5, duration: 0.4, type: "sine", delay: 0.18, volume: 0.75 },
      { freq: 1567.98, duration: 0.4, type: "sine", delay: 0.36, volume: 0.75 },
      { freq: 2093, duration: 0.6, type: "sine", delay: 0.54, volume: 0.8 },
    ],
    error: [
      { freq: 415.3, duration: 0.16, type: "sine", volume: 1 },
      { freq: 415.3, duration: 0.16, type: "sine", delay: 0.21, volume: 1 },
    ],
    success: [
      { freq: 1318.5, duration: 0.14, type: "sine", volume: 0.75 },
      { freq: 1760, duration: 0.14, type: "sine", delay: 0.09, volume: 0.75 },
      { freq: 2093, duration: 0.24, type: "sine", delay: 0.18, volume: 0.8 },
    ],
  },
  scifi: {
    click: [{ freq: 880, duration: 0.05, type: "sawtooth", volume: 0.4 }],
    notify: [
      { freq: 660, duration: 0.07, type: "sawtooth", volume: 0.4 },
      { freq: 990, duration: 0.09, type: "sawtooth", delay: 0.06, volume: 0.4 },
    ],
    roundEnd: [
      { freq: 440, duration: 0.12, type: "sawtooth", volume: 0.4 },
      { freq: 587.33, duration: 0.12, type: "sawtooth", delay: 0.1, volume: 0.4 },
      { freq: 739.99, duration: 0.12, type: "sawtooth", delay: 0.2, volume: 0.4 },
      { freq: 987.77, duration: 0.24, type: "sawtooth", delay: 0.3, volume: 0.45 },
    ],
    error: [
      { freq: 330, duration: 0.12, type: "sawtooth", volume: 0.9 },
      { freq: 330, duration: 0.12, type: "sawtooth", delay: 0.17, volume: 0.9 },
    ],
    success: [
      { freq: 523.25, duration: 0.06, type: "sawtooth", volume: 0.4 },
      { freq: 659.25, duration: 0.06, type: "sawtooth", delay: 0.06, volume: 0.4 },
      { freq: 880, duration: 0.06, type: "sawtooth", delay: 0.12, volume: 0.4 },
      { freq: 1174.66, duration: 0.14, type: "sawtooth", delay: 0.18, volume: 0.45 },
    ],
  },
  drum: {
    click: [{ freq: 220, duration: 0.05, type: "triangle", volume: 0.7 }],
    notify: [
      { freq: 294, duration: 0.05, type: "triangle", volume: 0.7 },
      { freq: 220, duration: 0.07, type: "triangle", delay: 0.06, volume: 0.7 },
    ],
    roundEnd: [
      { freq: 220, duration: 0.05, type: "triangle", volume: 0.6 },
      { freq: 220, duration: 0.05, type: "triangle", delay: 0.08, volume: 0.6 },
      { freq: 220, duration: 0.05, type: "triangle", delay: 0.16, volume: 0.7 },
      { freq: 220, duration: 0.05, type: "triangle", delay: 0.24, volume: 0.7 },
      { freq: 330, duration: 0.22, type: "triangle", delay: 0.34, volume: 0.9 },
    ],
    error: [
      { freq: 300, duration: 0.1, type: "square", volume: 1 },
      { freq: 300, duration: 0.1, type: "square", delay: 0.15, volume: 1 },
    ],
    success: [
      { freq: 300, duration: 0.06, type: "triangle", volume: 0.75 },
      { freq: 400, duration: 0.06, type: "triangle", delay: 0.07, volume: 0.8 },
      { freq: 500, duration: 0.12, type: "triangle", delay: 0.14, volume: 0.9 },
    ],
  },
};

// Insertion order here drives the dropdown order in Settings — keep in sync with
// how the group wants the list to read, not alphabetical or by kind.
export const SOUND_THEME_LABELS: Record<SoundTheme, string> = {
  soft: "🎵 ป๊อบ",
  minimal: "✨ โมเดิร์น",
  marimba: "🎶 ระนาด",
  piano: "🎹 เปียโน",
  bells: "🔔 ระฆังแก้ว",
  drum: "🥁 กลอง",
  scifi: "🚀 ซินธ์ไซไฟ",
  retro: "🕹️ เกมย้อนยุค",
};

export function playSound(kind: SoundKind, theme: SoundTheme, enabled: boolean, volume: SoundVolume = "normal") {
  if (!enabled) return;
  const pack = PACKS[theme] ?? PACKS.soft;
  playNotes(pack[kind], VOLUME_LEVELS[volume]);
}

// Roughly matches the character of each sound kind — a light tap for click/notify, a
// distinct double-buzz for error, a quick flutter for success, a longer flourish for
// round-end. Silently does nothing on devices/browsers without the Vibration API
// (notably iOS Safari), same as sound silently does nothing without Web Audio.
const VIBRATION_PATTERNS: Record<SoundKind, number | number[]> = {
  click: 8,
  notify: 15,
  roundEnd: [90, 60, 90, 60, 140],
  error: [40, 70, 40],
  success: [18, 30, 18, 30, 18],
};

export function vibrate(kind: SoundKind, enabled: boolean) {
  if (!enabled) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  navigator.vibrate(VIBRATION_PATTERNS[kind]);
}
