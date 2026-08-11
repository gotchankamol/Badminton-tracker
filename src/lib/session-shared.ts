// Shared between server (session.ts) and client (use-app-state.ts, SettingsModal.tsx) code —
// keep this file free of server-only imports (next/headers, prisma) since client bundles import it too.
export const SESSION_INVALID_ERROR = "ไม่มีสิทธิ์เข้าถึง กรุณากรอกรหัสผ่านใหม่";
