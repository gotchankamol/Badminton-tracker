import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { SESSION_INVALID_ERROR } from "./session-shared";

export const SESSION_COOKIE = "visitor_token";
export { SESSION_INVALID_ERROR };
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(length = 8): string {
  let out = "";
  for (const b of randomBytes(length)) out += CODE_CHARS[b % CODE_CHARS.length];
  return out;
}

export function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

export type Session = { visitorId: number; nickname: string; isOwner: boolean; accessCodeId: number };

export async function getSessionOrNull(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const visitor = await prisma.visitor.findUnique({
    where: { token },
    include: { accessCode: true },
  });
  if (!visitor || visitor.revoked || visitor.accessCode.revoked) return null;
  if (visitor.accessCode.expiresAt && visitor.accessCode.expiresAt < new Date()) return null;

  return {
    visitorId: visitor.id,
    nickname: visitor.nickname,
    isOwner: visitor.accessCode.isOwner,
    accessCodeId: visitor.accessCodeId,
  };
}

export async function requireSession(): Promise<Session> {
  const session = await getSessionOrNull();
  if (!session) throw new Error(SESSION_INVALID_ERROR);
  return session;
}

export async function requireOwnerSession(): Promise<Session> {
  const session = await requireSession();
  if (!session.isOwner) throw new Error("ต้องเป็นเจ้าของแอปเท่านั้น");
  return session;
}
