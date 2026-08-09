import { prisma } from "./db";
import { computeCurrentRoundStart, todayDateStr } from "./state-helpers";
import type { AppState } from "./types";

export async function ensureSettings() {
  return prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, price: 22, maxShuttleNumber: 12, dayResetHour: 5, dayResetEnabled: true, lastActiveDate: todayDateStr() },
  });
}

// If nobody has opened the app since a previous day, treat this as a new session:
// clear who was "on court" / "left" (a per-day flag) without touching the roster,
// shuttle history, or payment/debt records, which are never date-scoped. Also clears
// any mid-day round boundary, since a fresh calendar day is a fresh round on its own.
// Skipped entirely when the user has turned this automatic behavior off.
async function rolloverDayIfNeeded() {
  const settings = await ensureSettings();
  if (!settings.dayResetEnabled) return;
  const today = todayDateStr(settings.dayResetHour);
  if (settings.lastActiveDate !== today) {
    await prisma.$transaction([
      prisma.player.updateMany({
        where: { OR: [{ isToday: true }, { hasLeft: true }] },
        data: { isToday: false, hasLeft: false },
      }),
      prisma.settings.update({ where: { id: 1 }, data: { lastActiveDate: today, roundStartAt: null } }),
    ]);
  }
}

export async function getState(): Promise<AppState> {
  await rolloverDayIfNeeded();

  const roster = await prisma.player.findMany({
    include: { payments: { orderBy: { id: "asc" } } },
    orderBy: { id: "asc" },
  });
  const shuttles = await prisma.shuttle.findMany({ orderBy: { id: "asc" } });
  const settings = await ensureSettings();

  const roundStartAtIso = settings.roundStartAt ? settings.roundStartAt.toISOString() : null;
  const currentRoundStart = computeCurrentRoundStart(settings.dayResetHour, roundStartAtIso, settings.dayResetEnabled);

  return {
    roster: roster.map((p) => ({
      id: p.id,
      name: p.name,
      isToday: p.isToday,
      hasLeft: p.hasLeft,
      payments: p.payments.map((pay) => ({
        id: pay.id,
        amount: pay.amount,
        shuttleCount: pay.shuttleCount,
        at: pay.at ? pay.at.toISOString() : null,
      })),
    })),
    shuttles: shuttles.map((s) => ({
      id: s.id,
      numbers: s.numbers,
      playerIds: s.playerIds,
      date: s.date,
      createdAt: s.createdAt.toISOString(),
    })),
    settings: {
      price: settings.price,
      maxShuttleNumber: settings.maxShuttleNumber,
      dayResetHour: settings.dayResetHour,
      dayResetEnabled: settings.dayResetEnabled,
      roundStartAt: roundStartAtIso,
    },
    currentRoundStart: currentRoundStart.toISOString(),
  };
}
