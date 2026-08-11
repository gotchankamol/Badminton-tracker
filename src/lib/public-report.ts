"use server";

import { getState } from "./get-state";
import type { AppState } from "./types";

// Intentionally not behind the PIN gate — this is a read-only view of shuttle usage
// and money owed, meant to be checkable by any player without logging in.
export async function getPublicReport(): Promise<AppState> {
  return getState();
}
