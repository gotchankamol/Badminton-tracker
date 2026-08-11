@AGENTS.md

# Project notes (continuity across sessions)

Next.js + Prisma 7 app tracking shared badminton shuttle costs. Thai UI, user communicates in Thai — respond in Thai. No REST API routes; all mutations go through Server Actions in `src/lib/actions.ts` (`"use server"`), each returning fresh state via `getState()`.

## Running locally

Two long-running processes are required, independently of each other, and both die if the machine/terminal restarts:

```bash
npx prisma dev    # embedded local Postgres — must be running first
npm run dev        # Next.js dev server (Turbopack)
```

If the app shows `ECONNREFUSED` / `PrismaClientKnownRequestError`, the `prisma dev` process died — restart it, not just `npm run dev`.

Phone/LAN access: `next.config.ts` allowlists a hardcoded LAN IP (`allowedDevOrigins` + `experimental.serverActions.allowedOrigins`, bare IP no port) so Server Actions aren't rejected as cross-origin. If that IP changes (new router, different Wi-Fi), update `next.config.ts` and restart `npm run dev`.

## Known gotchas

- **Timestamps**: every `DateTime` field in `prisma/schema.prisma` must have `@db.Timestamptz(3)`. Without it, `@prisma/adapter-pg` silently shifts naive timestamps by the local UTC offset on write (caused a 7-hour bug once — see migration `20260809053722_use_timestamptz`).
- **After any schema change**: migrate → `npx prisma generate` → kill and restart `npm run dev` fresh (sometimes clear `.next` too). Stale Turbopack/Prisma-client caching causes false "bugs" otherwise.
- **"Round" / business day**: a round starts at either the business-day boundary (`dayResetHour`, default 5am, so late-night sessions don't split across midnight) or an explicit `roundStartAt` timestamp set by the "จบรอบ" (end round) button — whichever is later. See `src/lib/state-helpers.ts` (`computeCurrentRoundStart`, `isInCurrentRound`). `roundStartAt` lives in `Settings` and must be threaded through undo/redo (`replaceAllData`) or the round boundary resets on undo.
- **Undo/redo**: client-side snapshot stack in `src/lib/use-app-state.ts`; `undo`/`redo` call the `restoreState` server action, which wipes and recreates all rows from the JSON snapshot. Any field that should survive undo must be part of the client-visible `AppState` type.
- **Sound settings** live in `localStorage` (`src/lib/use-sound-settings.ts`), not the shared DB — it's a personal per-device preference, unlike everything else in this app which is shared group state.
- `mcp__visualize__show_widget` does not render for this user (confirmed repeatedly) — present visual choices via `AskUserQuestion` (≤4 options) or a plain numbered list in chat (>4 options), never the visualize tool.
- **Concurrent requests can trip `PrismaClientKnownRequestError: bind message supplies N parameters, but prepared statement "" requires 0`** — seen when 2+ browser tabs (or a HEAD+GET dev-mode prefetch race) hit `getState()` at the same moment. Self-heals on the very next request; it is not a real bug and does not need `prisma dev`/`npm run dev` restarted. Only chase it if it persists across several sequential (non-concurrent) requests.

## Testing in the browser tool

- The `computer` tool's click is flaky, especially at mobile viewport widths — prefer `javascript_tool` with `element.click()`/`dispatchEvent`.
- Console messages persist stale entries across navigations in this browser tool — cross-check against the dev server's live log output, or open a fresh tab.
- For timing-sensitive checks (animations, debounced UI), do the whole wait-and-check sequence inside one `javascript_exec` call using an internal `await new Promise(r => setTimeout(...))` — separate tool calls have unpredictable inter-call latency.
- Clean up any test data (roster names, shuttle entries) created during verification, e.g. via the app's own undo button.
- **Keep only one browser tab open against the dev server at a time** — extra tabs left open from earlier in the session are the main real-world trigger for the concurrent-request Prisma error above, and burn a lot of turns if mistaken for a code bug.
- **For fixtures the UI can't create directly** (e.g. a shuttle backdated to before the current round, to test carried-over-debt display), a disposable `pg` script against `DATABASE_URL` is fine — insert/delete directly, using a `🧪`-prefixed guest name so it's unambiguous test data, and delete it (and any shuttles referencing it) when done. This is faster and less noisy than trying to force the same state through the UI.
- For low-risk changes (copy tweaks, reordering a list, removing a hint) a `tsc --noEmit` pass plus one targeted `page.textContent.includes(...)` check is enough — don't repeat the full multi-scenario browser pass from a bigger feature for every follow-up tweak to it.

## Deployment

`README.md` has the Vercel + Neon deployment guide (written, not yet executed — still running locally as of this note).
