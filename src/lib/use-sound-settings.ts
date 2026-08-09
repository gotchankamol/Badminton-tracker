"use client";

import { useCallback, useEffect, useState } from "react";
import { playSound, type SoundTheme } from "./sound";

const KEY = "shuttle-ledger-sound";

type Stored = { enabled: boolean; theme: SoundTheme };

const DEFAULT: Stored = { enabled: true, theme: "soft" };

function loadStored(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT.enabled,
      theme: ["soft", "retro", "marimba", "minimal"].includes(parsed.theme) ? parsed.theme : DEFAULT.theme,
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

  const play = useCallback(
    (kind: "click" | "notify" | "roundEnd") => playSound(kind, settings.theme, settings.enabled),
    [settings.theme, settings.enabled]
  );

  return { enabled: settings.enabled, theme: settings.theme, setEnabled, setTheme, play };
}
