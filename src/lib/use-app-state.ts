"use client";

import { useCallback, useRef, useState } from "react";
import { restoreState } from "./actions";
import type { AppState } from "./types";

export function useAppState(initial: AppState, onError: (msg: string) => void) {
  const [state, setState] = useState<AppState>(initial);
  const stateRef = useRef<AppState>(initial);
  const historyRef = useRef<string[]>([]);
  const futureRef = useRef<string[]>([]);
  const [historyLen, setHistoryLen] = useState(0);
  const [futureLen, setFutureLen] = useState(0);

  const apply = useCallback((newState: AppState) => {
    stateRef.current = newState;
    setState(newState);
  }, []);

  const run = useCallback(
    async (fn: () => Promise<AppState>): Promise<AppState | null> => {
      const before = JSON.stringify(stateRef.current);
      try {
        const result = await fn();
        historyRef.current.push(before);
        if (historyRef.current.length > 50) historyRef.current.shift();
        futureRef.current = [];
        setHistoryLen(historyRef.current.length);
        setFutureLen(0);
        apply(result);
        return result;
      } catch (e) {
        onError(e instanceof Error ? e.message : String(e));
        return null;
      }
    },
    [apply, onError]
  );

  const runBlocked = useCallback(
    async (fn: () => Promise<{ state: AppState; blockedNames: string[] }>) => {
      const before = JSON.stringify(stateRef.current);
      try {
        const result = await fn();
        historyRef.current.push(before);
        if (historyRef.current.length > 50) historyRef.current.shift();
        futureRef.current = [];
        setHistoryLen(historyRef.current.length);
        setFutureLen(0);
        apply(result.state);
        return result;
      } catch (e) {
        onError(e instanceof Error ? e.message : String(e));
        return null;
      }
    },
    [apply, onError]
  );

  const undo = useCallback(async () => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current.pop()!;
    futureRef.current.push(JSON.stringify(stateRef.current));
    setHistoryLen(historyRef.current.length);
    setFutureLen(futureRef.current.length);
    const restored = await restoreState(JSON.parse(prev));
    apply(restored);
  }, [apply]);

  const redo = useCallback(async () => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop()!;
    historyRef.current.push(JSON.stringify(stateRef.current));
    setHistoryLen(historyRef.current.length);
    setFutureLen(futureRef.current.length);
    const restored = await restoreState(JSON.parse(next));
    apply(restored);
  }, [apply]);

  return {
    state,
    run,
    runBlocked,
    undo,
    redo,
    canUndo: historyLen > 0,
    canRedo: futureLen > 0,
    apply,
  };
}
