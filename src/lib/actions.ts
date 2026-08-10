"use server";

import { prisma } from "./db";
import { getState, ensureSettings } from "./get-state";
import { paidTotal, playerOwed, playerUsage, todayDateStr } from "./state-helpers";
import type { AppState, BackupData } from "./types";

async function currentState(): Promise<AppState> {
  return getState();
}

export async function addRosterPlayer(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("กรุณาใส่ชื่อ");
  const dup = await prisma.player.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (dup) throw new Error(`มีชื่อ "${dup.name}" อยู่ในคลังแล้ว ห้ามซ้ำ`);
  await prisma.player.create({ data: { name: trimmed, isToday: false, hasLeft: false } });
  return currentState();
}

export async function importRosterNames(names: string[]) {
  const existing = await prisma.player.findMany({ select: { name: true } });
  const existingLower = new Set(existing.map((p) => p.name.toLowerCase()));

  const added: string[] = [];
  const skipped: string[] = [];
  const seenLower = new Set<string>();

  for (const raw of names) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (existingLower.has(lower) || seenLower.has(lower)) {
      skipped.push(trimmed);
      continue;
    }
    seenLower.add(lower);
    added.push(trimmed);
  }

  if (added.length > 0) {
    await prisma.player.createMany({
      data: added.map((name) => ({ name, isToday: false, hasLeft: false })),
    });
  }

  return { state: await currentState(), added: added.length, skipped };
}

export async function editRosterPlayer(id: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("กรุณาใส่ชื่อ");
  const dup = await prisma.player.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" }, id: { not: id } },
  });
  if (dup) throw new Error(`มีชื่อ "${dup.name}" อยู่ในคลังแล้ว ห้ามซ้ำ`);
  await prisma.player.update({ where: { id }, data: { name: trimmed } });
  return currentState();
}

export async function deleteRosterPlayer(id: number) {
  const state = await currentState();
  const p = state.roster.find((pl) => pl.id === id);
  if (!p) return currentState();
  const owed = playerOwed(state, p);
  if (owed > 0) {
    throw new Error(
      `"${p.name}" ยังไม่ได้จ่ายเงินค่าลูกแบด (ค้าง ${owed} บาท) ลบออกจากคลังไม่ได้ จนกว่าจะจ่ายให้ครบในแท็บสรุปเงิน`
    );
  }
  const affectedShuttles = state.shuttles.filter((s) => s.playerIds.includes(id));
  await prisma.$transaction([
    ...affectedShuttles.map((s) =>
      prisma.shuttle.update({
        where: { id: s.id },
        data: { playerIds: s.playerIds.filter((pid) => pid !== id) },
      })
    ),
    prisma.player.delete({ where: { id } }),
  ]);
  return currentState();
}

export async function setPresentToday(id: number) {
  await prisma.player.update({ where: { id }, data: { isToday: true, hasLeft: false } });
  return currentState();
}

export async function setPresentTodayMultiple(ids: number[]) {
  if (ids.length > 0) {
    await prisma.player.updateMany({ where: { id: { in: ids } }, data: { isToday: true, hasLeft: false } });
  }
  return currentState();
}

// A guest is a real roster row (so shuttles/payments work exactly like anyone else)
// but flagged so endRound() can quietly delete them once paid up — see
// cleanupSettledGuests(). Names still share the same uniqueness constraint as the
// permanent roster.
export async function addGuestPlayer(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("กรุณาใส่ชื่อ");
  const dup = await prisma.player.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (dup) throw new Error(`มีชื่อ "${dup.name}" อยู่แล้ว ห้ามซ้ำ`);
  await prisma.player.create({ data: { name: trimmed, isToday: true, hasLeft: false, isGuest: true } });
  return currentState();
}

export async function removeFromToday(id: number) {
  const state = await currentState();
  const p = state.roster.find((pl) => pl.id === id);
  if (p) {
    const owed = playerOwed(state, p);
    if (owed > 0) {
      throw new Error(
        `"${p.name}" ยังไม่ได้จ่ายเงินค่าลูกแบด (ค้าง ${owed} บาท) ไม่สามารถลบออกจากรายชื่อวันนี้ได้ จนกว่าจะกดจ่ายแล้วในแท็บสรุปเงิน`
      );
    }
  }
  await prisma.player.update({ where: { id }, data: { isToday: false, hasLeft: true } });
  return currentState();
}

export async function clearToday() {
  const state = await currentState();
  const present = state.roster.filter((p) => p.isToday);
  const blocked = present.filter((p) => playerOwed(state, p) > 0);
  const removable = present.filter((p) => playerOwed(state, p) <= 0);
  await prisma.$transaction(
    removable.map((p) => prisma.player.update({ where: { id: p.id }, data: { isToday: false, hasLeft: true } }))
  );
  return { state: await currentState(), blockedNames: blocked.map((p) => p.name) };
}

export async function addShuttle(number: string, shares: Record<string, number>) {
  const total = Object.values(shares).reduce((s, n) => s + n, 0);
  if (total !== 4) throw new Error(`ยอดรวมจำนวนที่แต่ละคนจ่ายต้องเท่ากับ 4 (ตอนนี้รวมได้ ${total})`);
  const playerIds: number[] = [];
  Object.keys(shares).forEach((id) => {
    for (let i = 0; i < shares[id]; i++) playerIds.push(parseInt(id, 10));
  });
  const settings = await ensureSettings();
  await prisma.shuttle.create({
    data: { numbers: [number], playerIds, date: todayDateStr(settings.dayResetHour) },
  });
  return currentState();
}

export async function addNumberToShuttle(shuttleId: number, number: string) {
  await prisma.shuttle.update({
    where: { id: shuttleId },
    data: { numbers: { push: number } },
  });
  return currentState();
}

export async function deleteShuttle(id: number) {
  await prisma.shuttle.delete({ where: { id } });
  return currentState();
}

export async function payPlayer(id: number) {
  const state = await currentState();
  const p = state.roster.find((pl) => pl.id === id);
  if (!p) return currentState();
  const owed = playerOwed(state, p);
  if (owed > 0) {
    const count = playerUsage(state, id);
    const previousCovered = (p.payments || []).reduce((s, pay) => s + (pay.shuttleCount || 0), 0);
    const shuttleCount = Math.max(0, count - previousCovered);
    await prisma.$transaction([
      prisma.payment.create({
        data: { playerId: id, amount: owed, shuttleCount, at: new Date() },
      }),
      ...(p.isToday
        ? [prisma.player.update({ where: { id }, data: { isToday: false, hasLeft: true } })]
        : []),
    ]);
  } else if ((p.payments || []).length > 0 && paidTotal(p) > 0) {
    const last = p.payments[p.payments.length - 1];
    await prisma.payment.delete({ where: { id: last.id } });
  }
  return currentState();
}

export async function updateSettings(price: number, maxShuttleNumber: number, dayResetHour: number, dayResetEnabled: boolean) {
  const safePrice = Number.isFinite(price) ? price : 0;
  const safeMax = Number.isFinite(maxShuttleNumber) && maxShuttleNumber >= 1 ? maxShuttleNumber : 12;
  const safeHour = Number.isFinite(dayResetHour) && dayResetHour >= 0 && dayResetHour <= 23 ? Math.floor(dayResetHour) : 5;
  await ensureSettings();
  await prisma.settings.update({
    where: { id: 1 },
    data: { price: safePrice, maxShuttleNumber: safeMax, dayResetHour: safeHour, dayResetEnabled },
  });
  return currentState();
}

// Guests (see addGuestPlayer) are only meant to exist for the day they were added —
// once fully paid up, quietly remove them from the roster so they don't clutter the
// permanent player picker. Anyone still owing money is left alone (name and all) so
// their debt is never lost; they'll get swept up on a future end-round once settled.
async function cleanupSettledGuests() {
  const guests = await prisma.player.findMany({ where: { isGuest: true }, include: { payments: true } });
  if (guests.length === 0) return;
  const settings = await ensureSettings();
  const shuttles = await prisma.shuttle.findMany();

  const toDelete = guests
    .filter((g) => {
      const usage = shuttles.reduce((sum, s) => {
        const occ = s.playerIds.filter((pid) => pid === g.id).length;
        const numCount = (s.numbers && s.numbers.length) || 1;
        return sum + occ * numCount;
      }, 0);
      const paid = g.payments.reduce((sum, pay) => sum + pay.amount, 0);
      return usage * settings.price - paid <= 0;
    })
    .map((g) => g.id);
  if (toDelete.length === 0) return;

  const affectedShuttles = shuttles.filter((s) => s.playerIds.some((pid) => toDelete.includes(pid)));
  await prisma.$transaction([
    ...affectedShuttles.map((s) =>
      prisma.shuttle.update({
        where: { id: s.id },
        data: { playerIds: s.playerIds.filter((pid) => !toDelete.includes(pid)) },
      })
    ),
    prisma.player.deleteMany({ where: { id: { in: toDelete } } }),
  ]);
}

// Doesn't delete anything (except settled guests, see cleanupSettledGuests) — starts a
// fresh round so the Shuttles tab and Summary tab only show activity from this point
// on. Anyone who still owes money keeps showing up in the summary regardless (debt is
// always all-time, never scoped to a round).
export async function endRound() {
  await ensureSettings();
  await prisma.$transaction([
    prisma.player.updateMany({ data: { isToday: false, hasLeft: false } }),
    prisma.settings.update({ where: { id: 1 }, data: { roundStartAt: new Date() } }),
  ]);
  await cleanupSettledGuests();
  return currentState();
}

async function replaceAllData(state: Omit<AppState, "currentRoundStart">) {
  await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany();
    await tx.shuttle.deleteMany();
    await tx.player.deleteMany();

    for (const p of state.roster) {
      await tx.player.create({
        data: {
          id: p.id,
          name: p.name,
          isToday: p.isToday,
          hasLeft: p.hasLeft,
          isGuest: p.isGuest,
          payments: {
            create: p.payments.map((pay) => ({
              id: pay.id,
              amount: pay.amount,
              shuttleCount: pay.shuttleCount,
              at: pay.at ? new Date(pay.at) : null,
            })),
          },
        },
      });
    }
    for (const s of state.shuttles) {
      await tx.shuttle.create({
        data: {
          id: s.id,
          numbers: s.numbers,
          playerIds: s.playerIds,
          date: s.date,
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
        },
      });
    }
    const dayResetHour = state.settings.dayResetHour;
    const dayResetEnabled = state.settings.dayResetEnabled;
    const roundStartAt = state.settings.roundStartAt ? new Date(state.settings.roundStartAt) : null;
    await tx.settings.upsert({
      where: { id: 1 },
      update: {
        price: state.settings.price,
        maxShuttleNumber: state.settings.maxShuttleNumber,
        dayResetHour,
        dayResetEnabled,
        lastActiveDate: todayDateStr(dayResetHour),
        roundStartAt,
      },
      create: {
        id: 1,
        price: state.settings.price,
        maxShuttleNumber: state.settings.maxShuttleNumber,
        dayResetHour,
        dayResetEnabled,
        lastActiveDate: todayDateStr(dayResetHour),
        roundStartAt,
      },
    });

    await tx.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"Player"', 'id'), COALESCE((SELECT MAX(id) FROM "Player"), 1))`
    );
    await tx.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"Payment"', 'id'), COALESCE((SELECT MAX(id) FROM "Payment"), 1))`
    );
    await tx.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"Shuttle"', 'id'), COALESCE((SELECT MAX(id) FROM "Shuttle"), 1))`
    );
  });
}

export async function restoreState(snapshot: AppState) {
  await replaceAllData(snapshot);
  return currentState();
}

function normalizeBackup(parsed: BackupData): Omit<AppState, "currentRoundStart"> {
  const price = typeof parsed.price === "number" ? parsed.price : 22;
  const maxShuttleNumber = typeof parsed.maxShuttleNumber === "number" ? parsed.maxShuttleNumber : 12;
  const dayResetHour =
    typeof parsed.dayResetHour === "number" && parsed.dayResetHour >= 0 && parsed.dayResetHour <= 23 ? parsed.dayResetHour : 5;
  const todayIds = Array.isArray(parsed.todayIds) ? parsed.todayIds : [];
  const leftTodayIds = Array.isArray(parsed.leftTodayIds) ? parsed.leftTodayIds : [];

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffStr =
    cutoff.getFullYear() + "-" + String(cutoff.getMonth() + 1).padStart(2, "0") + "-" + String(cutoff.getDate()).padStart(2, "0");

  const shuttles = (parsed.shuttles || [])
    .map((sh) => ({
      id: sh.id,
      numbers: Array.isArray(sh.numbers) ? sh.numbers.map(String) : sh.number !== undefined ? [String(sh.number)] : [],
      playerIds: sh.playerIds,
      date: sh.date || todayDateStr(dayResetHour),
      createdAt: sh.createdAt || new Date().toISOString(),
    }))
    .filter((sh) => sh.date >= cutoffStr);

  const roster = (parsed.roster || []).map((p) => ({
    id: p.id,
    name: p.name,
    isToday: todayIds.includes(p.id),
    hasLeft: leftTodayIds.includes(p.id),
    isGuest: false,
    payments: (p.payments || []).map((pay, i) => ({
      id: i + 1,
      amount: pay.amount,
      shuttleCount: typeof pay.shuttleCount === "number" ? pay.shuttleCount : null,
      at: pay.at ?? null,
    })),
  }));

  let nextPaymentId = 1;
  roster.forEach((p) => {
    p.payments = p.payments.map((pay) => ({ ...pay, id: nextPaymentId++ }));
  });

  const roundStartAt = typeof parsed.roundStartAt === "string" ? parsed.roundStartAt : null;
  const dayResetEnabled = typeof parsed.dayResetEnabled === "boolean" ? parsed.dayResetEnabled : true;

  return { roster, shuttles, settings: { price, maxShuttleNumber, dayResetHour, dayResetEnabled, roundStartAt } };
}

// Wipes every player, shuttle, and payment, and puts Settings back to the values in
// prisma/schema.prisma's @default(...) — an escape hatch for starting completely over
// (e.g. testing, or handing the tracker to a new group), distinct from "จบรอบ" which
// only resets the current round and keeps all history.
export async function resetApp() {
  await replaceAllData({
    roster: [],
    shuttles: [],
    settings: { price: 22, maxShuttleNumber: 12, dayResetHour: 5, dayResetEnabled: true, roundStartAt: null },
  });
  return currentState();
}

export async function importBackup(json: string) {
  let parsed: BackupData;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("ข้อมูลที่วางไม่ถูกต้อง — ตรวจสอบว่าคัดลอกมาครบทั้งข้อความ");
  }
  if (!parsed || !Array.isArray(parsed.roster) || !Array.isArray(parsed.shuttles)) {
    throw new Error("ข้อมูลที่วางไม่ใช่ไฟล์สำรองของแอปนี้");
  }
  const normalized = normalizeBackup(parsed);
  await replaceAllData(normalized);
  return currentState();
}
