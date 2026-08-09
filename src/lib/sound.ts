"use client";

export type SoundTheme = "soft" | "retro" | "marimba" | "minimal";

type Note = { freq: number; duration: number; delay?: number; type?: OscillatorType; volume?: number };
type SoundKind = "click" | "notify" | "roundEnd";

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
  },
  minimal: {
    click: [{ freq: 1200, duration: 0.035, type: "sine", volume: 0.5 }],
    notify: [{ freq: 1000, duration: 0.1, type: "sine", volume: 0.55 }],
    roundEnd: [
      { freq: 880, duration: 0.14, type: "sine", volume: 0.6 },
      { freq: 1174.66, duration: 0.2, type: "sine", delay: 0.12, volume: 0.6 },
    ],
  },
};

export const SOUND_THEME_LABELS: Record<SoundTheme, string> = {
  soft: "ป๊อปนุ่มๆ",
  retro: "8-bit เกมย้อนยุค",
  marimba: "ระนาด/มาริมบา",
  minimal: "มินิมอล โมเดิร์น",
};

export function playSound(kind: SoundKind, theme: SoundTheme, enabled: boolean) {
  if (!enabled) return;
  const pack = PACKS[theme] ?? PACKS.soft;
  playNotes(pack[kind]);
}
