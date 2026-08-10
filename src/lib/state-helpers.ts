import type { AppState, Player, Shuttle } from "./types";

export const CHIP_COLORS = [
  { bg: "#FFE0EA", border: "#FF5D8F" },
  { bg: "#DBF2FF", border: "#3AB0FF" },
  { bg: "#D3FBF0", border: "#06D6A0" },
  { bg: "#FFE7C2", border: "#FF9F1C" },
  { bg: "#EBE0FF", border: "#9B6BFF" },
  { bg: "#FFF3B0", border: "#E8B400" },
];

export function chipColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % CHIP_COLORS.length;
  return CHIP_COLORS[Math.abs(h)];
}

// 7 clearly distinct colors for how many times a shuttle number has been used today
// (×1 orange, ×2 pink, ×3 blue, ×4 green, ×5 purple, ×6 gold, ×7 red), then repeats.
export const USAGE_COLORS = [
  { bg: "#FFE7C2", border: "#FF9F1C" },
  { bg: "#FFE0EA", border: "#FF5D8F" },
  { bg: "#DBF2FF", border: "#3AB0FF" },
  { bg: "#D3FBF0", border: "#06D6A0" },
  { bg: "#EBE0FF", border: "#9B6BFF" },
  { bg: "#FFF3B0", border: "#E8B400" },
  { bg: "#FCEBEB", border: "#E24B4A" },
];

export function countColor(count: number): { bg: string; border: string } {
  return USAGE_COLORS[(count - 1) % USAGE_COLORS.length];
}

// Badminton sessions often run past midnight, so "today" doesn't flip at 00:00 —
// anything before the configured reset hour (default 5am) still counts as the
// previous day's session. A game that ends at 1am stays grouped with the shuttles
// logged earlier that same night, and the "who's on court" list won't reset until
// well after everyone's actually gone home.
export function todayDateStr(cutoffHour = 5): string {
  const d = new Date();
  if (d.getHours() < cutoffHour) d.setDate(d.getDate() - 1);
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

// The instant "today's" business day began, per the configured reset hour.
export function businessDayStart(cutoffHour = 5): Date {
  const dateStr = todayDateStr(cutoffHour);
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, cutoffHour, 0, 0, 0);
}

// The current round starts at the later of (a) the business day's start, or
// (b) the last time someone pressed "end round" — so an explicit reset always wins,
// but a fresh calendar day also starts a fresh round even without pressing anything.
// If automatic day-resetting is turned off, (a) never applies — only an explicit
// "end round" press ever starts a new round, otherwise everything ever logged counts.
export function computeCurrentRoundStart(cutoffHour: number, roundStartAt: string | null, dayResetEnabled = true): Date {
  if (!dayResetEnabled) return roundStartAt ? new Date(roundStartAt) : new Date(0);
  const dayStart = businessDayStart(cutoffHour);
  if (!roundStartAt) return dayStart;
  const explicit = new Date(roundStartAt);
  return explicit > dayStart ? explicit : dayStart;
}

export function isInCurrentRound(state: AppState, s: Shuttle): boolean {
  return new Date(s.createdAt) >= new Date(state.currentRoundStart);
}

export function rosterName(state: AppState, id: number): string {
  const p = state.roster.find((pl) => pl.id === id);
  return p ? p.name : "?";
}

export function sortedRoster(state: AppState): Player[] {
  return state.roster.slice().sort((a, b) => a.name.localeCompare(b.name, "th"));
}

export function playerUsage(state: AppState, id: number): number {
  let total = 0;
  state.shuttles.forEach((s) => {
    const occurrences = s.playerIds.filter((pid) => pid === id).length;
    const numCount = (s.numbers && s.numbers.length) || 1;
    total += occurrences * numCount;
  });
  return total;
}

export function paidTotal(p: Player): number {
  return (p.payments || []).reduce((sum, pay) => sum + pay.amount, 0);
}

export function playerOwed(state: AppState, p: Player): number {
  return Math.max(0, playerUsage(state, p.id) * state.settings.price - paidTotal(p));
}

export function isSettled(state: AppState, p: Player): boolean {
  return playerUsage(state, p.id) > 0 && playerOwed(state, p) <= 0;
}

export function playerActiveInCurrentRound(state: AppState, id: number): boolean {
  return state.shuttles.some((s) => s.playerIds.includes(id) && isInCurrentRound(state, s));
}

// A player who owed money from before this round but didn't play today: once their
// debt is fully paid off they'd otherwise vanish from the summary with no trace. If
// the payment that cleared them landed during this round, keep them visible in the
// "paid" list (caller adds a note) instead — this resets naturally once "จบรอบ" starts
// a new round, so it never accumulates every old debtor forever.
export function playerJustClearedOldDebt(state: AppState, p: Player): boolean {
  if (playerActiveInCurrentRound(state, p.id)) return false;
  if (playerUsage(state, p.id) === 0) return false;
  if (!isSettled(state, p)) return false;
  return (p.payments || []).some((pay) => pay.at && new Date(pay.at) >= new Date(state.currentRoundStart));
}

// Splits a player's outstanding balance into "from before this round" vs "from this
// round". Payments aren't tied to specific shuttles, so — same FIFO convention as
// payment.shuttleCount elsewhere — a payment always clears the oldest usage first,
// meaning old debt must be fully paid off before any of it counts toward this round.
export function playerOwedSplit(state: AppState, p: Player): { oldOwed: number; roundOwed: number } {
  let oldUnits = 0;
  let roundUnits = 0;
  state.shuttles.forEach((s) => {
    const occ = s.playerIds.filter((pid) => pid === p.id).length;
    if (occ === 0) return;
    const units = occ * shuttleUnitCount(s);
    if (isInCurrentRound(state, s)) roundUnits += units;
    else oldUnits += units;
  });
  const oldCost = oldUnits * state.settings.price;
  const roundCost = roundUnits * state.settings.price;
  let paidRemaining = paidTotal(p);
  const paidOld = Math.min(paidRemaining, oldCost);
  paidRemaining -= paidOld;
  const paidRound = Math.min(paidRemaining, roundCost);
  return { oldOwed: oldCost - paidOld, roundOwed: roundCost - paidRound };
}

export type GameEntry = {
  shuttleId: number;
  numbers: string[];
  date: string;
  createdAt: string;
  namesStr: string;
  units: number;
};

function playerGamesChronological(state: AppState, id: number): GameEntry[] {
  return state.shuttles
    .filter((s) => s.playerIds.includes(id))
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((s) => {
      const shares = s.playerIds.filter((pid) => pid === id).length;
      const grouped = groupPlayerIds(s.playerIds);
      const namesStr = grouped
        .map((g) => {
          const nm = rosterName(state, g.id);
          return g.count > 1 ? `${nm} ×${g.count}` : nm;
        })
        .join(", ");
      return { shuttleId: s.id, numbers: s.numbers || [], date: s.date, createdAt: s.createdAt, namesStr, units: shares * shuttleUnitCount(s) };
    });
}

export type CoveredGame = { entry: GameEntry; unitsCovered: number };
export type PaymentGroup = { payment: Player["payments"][number]; games: CoveredGame[] };

// For each payment (in the order it was made), which specific shuttle records it
// settled — plus whatever's left unpaid. A shuttle can straddle two payments if its
// number count grew (via "+ เพิ่มหมายเลขลูก") after it was partially paid off.
export function playerPaymentBreakdown(state: AppState, p: Player): { groups: PaymentGroup[]; unpaid: CoveredGame[] } {
  const games = playerGamesChronological(state, p.id);
  let gameIdx = 0;
  let consumedInCurrent = 0;

  const groups: PaymentGroup[] = (p.payments || []).map((payment) => {
    let remaining = payment.shuttleCount ?? 0;
    const covered: CoveredGame[] = [];
    while (remaining > 0 && gameIdx < games.length) {
      const g = games[gameIdx];
      const available = g.units - consumedInCurrent;
      const take = Math.min(remaining, available);
      if (take > 0) covered.push({ entry: g, unitsCovered: take });
      consumedInCurrent += take;
      remaining -= take;
      if (consumedInCurrent >= g.units) {
        gameIdx++;
        consumedInCurrent = 0;
      }
    }
    return { payment, games: covered };
  });

  const unpaid: CoveredGame[] = [];
  if (gameIdx < games.length) {
    const g = games[gameIdx];
    const remainingUnits = g.units - consumedInCurrent;
    if (remainingUnits > 0) unpaid.push({ entry: g, unitsCovered: remainingUnits });
    for (let i = gameIdx + 1; i < games.length; i++) unpaid.push({ entry: games[i], unitsCovered: games[i].units });
  }

  return { groups, unpaid };
}

export function groupPlayerIds(playerIds: number[]): { id: number; count: number }[] {
  const grouped: { id: number; count: number }[] = [];
  playerIds.forEach((pid) => {
    const existing = grouped.find((g) => g.id === pid);
    if (existing) existing.count++;
    else grouped.push({ id: pid, count: 1 });
  });
  return grouped;
}

export function formatThaiDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

export function shuttleUnitCount(s: Shuttle): number {
  return (s.numbers && s.numbers.length) || 1;
}

export type ReportRow = {
  name: string;
  count: number;
  total: number;
  paid: number;
  owed: number;
  paymentsCount: number;
};

export function buildReportData(state: AppState): ReportRow[] {
  return state.roster
    .map((p) => {
      const count = playerUsage(state, p.id);
      const total = count * state.settings.price;
      const paid = Math.min(paidTotal(p), total);
      const owed = Math.max(0, total - paid);
      return { name: p.name, count, total, paid, owed, paymentsCount: (p.payments || []).length };
    })
    .filter((r) => r.count > 0 || r.paid > 0);
}

export function reportTotals(state: AppState, data: ReportRow[]) {
  const totalShuttles = state.shuttles.reduce((s, sh) => s + shuttleUnitCount(sh), 0);
  let totalOwed = 0;
  let totalPaid = 0;
  data.forEach((r) => {
    totalOwed += r.owed;
    totalPaid += r.paid;
  });
  return { totalShuttles, totalOwed, totalPaid };
}

export function buildDayReportData(state: AppState, dateStr: string): ReportRow[] {
  return state.roster
    .map((p) => {
      let count = 0;
      state.shuttles
        .filter((s) => s.date === dateStr)
        .forEach((s) => {
          const occ = s.playerIds.filter((pid) => pid === p.id).length;
          count += occ * shuttleUnitCount(s);
        });
      return { name: p.name, count, total: count * state.settings.price, paid: 0, owed: 0, paymentsCount: 0 };
    })
    .filter((r) => r.count > 0);
}
