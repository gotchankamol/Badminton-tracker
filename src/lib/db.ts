import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Local dev (`npx prisma dev`) is a plain local Postgres, which needs a direct TCP
// connection (adapter-pg). Production talks to Neon over serverless HTTP/WebSocket
// (adapter-neon) instead — a raw TCP pool doesn't survive concurrent Vercel function
// invocations reliably (caused intermittent "bind message" errors in production).
const adapter =
  process.env.NODE_ENV === "production"
    ? new PrismaNeon({ connectionString: process.env.DATABASE_URL })
    : new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
