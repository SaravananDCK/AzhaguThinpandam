import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaTuned?: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// SQLite is single-writer. WAL lets reads run during writes, and busy_timeout
// makes concurrent writers WAIT for the lock (up to 15s) instead of failing —
// without this, batch operations (e.g. saving many prices at once) trip
// Prisma's transaction timeout. Runs once per process, fire-and-forget.
if (!globalForPrisma.prismaTuned) {
  globalForPrisma.prismaTuned = true;
  prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL").catch(() => {});
  prisma.$queryRawUnsafe("PRAGMA busy_timeout=15000").catch(() => {});
}
