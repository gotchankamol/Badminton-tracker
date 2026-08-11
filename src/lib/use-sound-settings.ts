"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playSound, SOUND_THEME_LABELS, vibrate, type SoundKind, type SoundTheme, type SoundVolume } from "./sound";

const KEY = "shuttle-ledger-sound";

type Stored = { enabled: boolean; theme: SoundTheme; volume: SoundVolume; vibrationEnabled: boolean };

const DEFAULT: Stored = { enabled: true, theme: "soft", volume: "normal", vibrationEnabled: false };

function loadStored(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT.enabled,
      theme: Object.keys(SOUND_THEME_LABELS).includes(parsed.theme) ? parsed.theme : DEFAULT.theme,
      volume: ["low", "normal", "loud"].includes(parsed.volume) ? parsed.volume : DEFAULT.volume,
      vibrationEnabled: typeof parsed.vibrationEnabled === "boolean" ? parsed.vibrationEnabled : DEFAULT.vibrationEnabled,
    };
  } catch {
    return DEFAULT;
  }
}

// Sound preference is personal to this device/browser, not shared group data —
// stored in localStorage, not the database. Starts at the same default on both
// server and client render to avoid a hydration mismatch, then syncs from
// localStorage right after mount.
export function useSoundSettings() {
  const [settings, setSettingsState] = useState<Stored>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettingsState(loadStored());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // ignore (private browsing, storage full, etc.)
    }
  }, [settings, loaded]);

  const setEnabled = useCallback((enabled: boolean) => setSettingsState((s) => ({ ...s, enabled })), []);
  const setTheme = useCallback((theme: SoundTheme) => setSettingsState((s) => ({ ...s, theme })), []);
  const setVolume = useCallback((volume: SoundVolume) => setSettingsState((s) => ({ ...s, volume })), []);
  const setVibrationEnabled = useCallback((vibrationEnabled: boolean) => setSettingsState((s) => ({ ...s, vibrationEnabled })), []);

  // Settings panel calls setTheme()/setVolume() and then schedules a preview play() in
  // the same handler (auto-preview on selection) — a setTimeout callback closing directly
  // over `settings` would still see the pre-update value, since the state update hasn't
  // committed yet when the closure is created. Reading through a ref instead means play()
  // always reflects whatever is current when it actually runs, not when it was captured.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const play = useCallback((kind: SoundKind) => {
    const s = settingsRef.current;
    playSound(kind, s.theme, s.enabled, s.volume);
    vibrate(kind, s.vibrationEnabled);
  }, []);

  return {
    enabled: settings.enabled,
    theme: settings.theme,
    volume: settings.volume,
    vibrationEnabled: settings.vibrationEnabled,
    setEnabled,
    setTheme,
    setVolume,
    setVibrationEnabled,
    play,
  };
}
