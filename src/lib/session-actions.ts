"use server";

import { cookies, headers } from "next/headers";
import { prisma } from "./db";
import { generateCode, generateToken, getSessionOrNull, requireOwnerSession, SESSION_COOKIE } from "./session";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

export async function verifyAccessCode(rawCode: string, rawNickname: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ip = await clientIp();
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recentAttempts = await prisma.loginAttempt.count({ where: { ip, createdAt: { gte: since } } });
  if (recentAttempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { ok: false, error: "กรอกผิดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่" };
  }

  const code = rawCode.trim().toUpperCase();
  const nickname = rawNickname.trim();
  if (!code) return { ok: false, error: "กรุณากรอกรหัสผ่าน" };
  if (!nickname) return { ok: false, error: "กรุณากรอกชื่อเล่น" };

  const accessCode = await prisma.accessCode.findUnique({ where: { code } });
  if (!accessCode || accessCode.revoked) {
    await prisma.loginAttempt.create({ data: { ip } });
    return { ok: false, error: "รหัสผ่านไม่ถูกต้อง" };
  }

  if (accessCode.expiresAt && accessCode.expiresAt < new Date()) {
    return { ok: false, error: "รหัสนี้หมดอายุแล้ว กรุณาติดต่อขอรหัสใหม่" };
  }

  if (accessCode.maxUses != null) {
    const uses = await prisma.visitor.count({ where: { accessCodeId: accessCode.id, revoked: false } });
    if (uses >= accessCode.maxUses) {
      return { ok: false, error: "รหัสนี้มีคนใช้ครบจำนวนแล้ว กรุณาขอรหัสใหม่" };
    }
  }

  const token = generateToken();
  await prisma.visitor.create({ data: { token, nickname, accessCodeId: accessCode.id } });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return { ok: true };
}

export async function heartbeat(): Promise<void> {
  const session = await getSessionOrNull();
  if (!session) return;
  await prisma.visitor.update({ where: { id: session.visitorId }, data: { lastSeenAt: new Date() } });
}

export type AccessCodeSummary = {
  id: number;
  code: string;
  label: string;
  maxUses: number | null;
  useCount: number;
  isOwner: boolean;
  revoked: boolean;
  createdAt: string;
  expiresAt: string | null;
  expired: boolean;
};

export async function listAccessCodes(): Promise<AccessCodeSummary[]> {
  await requireOwnerSession();
  const codes = await prisma.accessCode.findMany({
    include: { _count: { select: { visitors: { where: { revoked: false } } } } },
    orderBy: { createdAt: "desc" },
  });
  const now = Date.now();
  return codes.map((c) => ({
    id: c.id,
    code: c.code,
    label: c.label,
    maxUses: c.maxUses,
    useCount: c._count.visitors,
    isOwner: c.isOwner,
    revoked: c.revoked,
    createdAt: c.createdAt.toISOString(),
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    expired: !!c.expiresAt && c.expiresAt.getTime() < now,
  }));
}

export async function createAccessCode(label: string, maxUses: number | null, expiresAt: string | null): Promise<AccessCodeSummary[]> {
  await requireOwnerSession();
  const trimmed = label.trim();
  if (!trimmed) throw new Error("กรุณาใส่ชื่อกำกับรหัส");

  let code = generateCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const dup = await prisma.accessCode.findUnique({ where: { code } });
    if (!dup) break;
    code = generateCode();
  }

  await prisma.accessCode.create({
    data: { code, label: trimmed, maxUses: maxUses ?? null, expiresAt: expiresAt ? new Date(expiresAt) : null },
  });
  return listAccessCodes();
}

// expiresAt: undefined means "leave the current expiry untouched" (e.g. editing just the
// label) — distinct from null, which explicitly clears any expiry.
export async function updateAccessCode(
  id: number,
  label: string,
  code: string,
  maxUses: number | null,
  expiresAt: string | null | undefined
): Promise<AccessCodeSummary[]> {
  await requireOwnerSession();
  const target = await prisma.accessCode.findUnique({ where: { id } });
  if (!target || target.isOwner) return listAccessCodes();

  const trimmedLabel = label.trim();
  if (!trimmedLabel) throw new Error("กรุณาใส่ชื่อกำกับรหัส");
  const trimmedCode = code.trim().toUpperCase();
  if (!trimmedCode) throw new Error("กรุณาใส่รหัสผ่าน");

  const dup = await prisma.accessCode.findFirst({ where: { code: trimmedCode, id: { not: id } } });
  if (dup) throw new Error(`รหัส "${trimmedCode}" ถูกใช้อยู่แล้ว`);

  await prisma.accessCode.update({
    where: { id },
    data: expiresAt === undefined
      ? { label: trimmedLabel, code: trimmedCode, maxUses: maxUses ?? null }
      : { label: trimmedLabel, code: trimmedCode, maxUses: maxUses ?? null, expiresAt: expiresAt ? new Date(expiresAt) : null },
  });
  return listAccessCodes();
}

export async function toggleAccessCode(id: number): Promise<AccessCodeSummary[]> {
  await requireOwnerSession();
  const current = await prisma.accessCode.findUnique({ where: { id } });
  if (current) {
    await prisma.accessCode.update({ where: { id }, data: { revoked: !current.revoked } });
  }
  return listAccessCodes();
}

export async function deleteAccessCode(id: number): Promise<AccessCodeSummary[]> {
  await requireOwnerSession();
  const target = await prisma.accessCode.findUnique({ where: { id } });
  if (target && !target.isOwner) {
    await prisma.accessCode.delete({ where: { id } });
  }
  return listAccessCodes();
}

export type VisitorSummary = {
  id: number;
  nickname: string;
  codeLabel: string;
  revoked: boolean;
  createdAt: string;
  lastSeenAt: string;
  online: boolean;
};

const ONLINE_WINDOW_MS = 90 * 1000;

export async function listVisitors(): Promise<VisitorSummary[]> {
  await requireOwnerSession();
  const visitors = await prisma.visitor.findMany({
    include: { accessCode: { select: { label: true } } },
    orderBy: { lastSeenAt: "desc" },
  });
  const now = Date.now();
  return visitors.map((v) => ({
    id: v.id,
    nickname: v.nickname,
    codeLabel: v.accessCode.label,
    revoked: v.revoked,
    createdAt: v.createdAt.toISOString(),
    lastSeenAt: v.lastSeenAt.toISOString(),
    online: !v.revoked && now - v.lastSeenAt.getTime() < ONLINE_WINDOW_MS,
  }));
}

export async function revokeVisitor(id: number): Promise<VisitorSummary[]> {
  await requireOwnerSession();
  await prisma.visitor.update({ where: { id }, data: { revoked: true } });
  return listVisitors();
}

export async function deleteVisitor(id: number): Promise<VisitorSummary[]> {
  await requireOwnerSession();
  const target = await prisma.visitor.findUnique({ where: { id } });
  if (target && target.revoked) {
    await prisma.visitor.delete({ where: { id } });
  }
  return listVisitors();
}

export type AdminSnapshot = {
  codes: {
    id: number;
    code: string;
    label: string;
    maxUses: number | null;
    expiresAt: string | null;
    isOwner: boolean;
    revoked: boolean;
    createdAt: string;
  }[];
  visitors: {
    id: number;
    token: string;
    nickname: string;
    accessCodeId: number;
    revoked: boolean;
    createdAt: string;
    lastSeenAt: string;
  }[];
};

export async function getAdminSnapshot(): Promise<AdminSnapshot> {
  await requireOwnerSession();
  const codes = await prisma.accessCode.findMany({ orderBy: { id: "asc" } });
  const visitors = await prisma.visitor.findMany({ orderBy: { id: "asc" } });
  return {
    codes: codes.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null })),
    visitors: visitors.map((v) => ({ ...v, createdAt: v.createdAt.toISOString(), lastSeenAt: v.lastSeenAt.toISOString() })),
  };
}

export async function restoreAdminSnapshot(snapshot: AdminSnapshot): Promise<{ codes: AccessCodeSummary[]; visitors: VisitorSummary[] }> {
  await requireOwnerSession();
  await prisma.$transaction(async (tx) => {
    await tx.visitor.deleteMany();
    await tx.accessCode.deleteMany();
    for (const c of snapshot.codes) {
      await tx.accessCode.create({
        data: {
          id: c.id,
          code: c.code,
          label: c.label,
          maxUses: c.maxUses,
          expiresAt: c.expiresAt ? new Date(c.expiresAt) : null,
          isOwner: c.isOwner,
          revoked: c.revoked,
          createdAt: new Date(c.createdAt),
        },
      });
    }
    for (const v of snapshot.visitors) {
      await tx.visitor.create({
        data: {
          id: v.id,
          token: v.token,
          nickname: v.nickname,
          accessCodeId: v.accessCodeId,
          revoked: v.revoked,
          createdAt: new Date(v.createdAt),
          lastSeenAt: new Date(v.lastSeenAt),
        },
      });
    }
    await tx.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"AccessCode"', 'id'), COALESCE((SELECT MAX(id) FROM "AccessCode"), 1))`
    );
    await tx.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"Visitor"', 'id'), COALESCE((SELECT MAX(id) FROM "Visitor"), 1))`
    );
  });
  return { codes: await listAccessCodes(), visitors: await listVisitors() };
}
