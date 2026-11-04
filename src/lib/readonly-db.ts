import { PrismaClient } from "@prisma/client";

// A second, read-only connection to the store database, for SQL written by the
// admin AI assistant. It has its own single connection with SQLite's
// query_only switch on, so a write that slips past the assistant's checks is
// still refused by SQLite itself. Never set query_only on the main client in
// src/lib/prisma.ts — the whole app would stop being able to write.

const globalForReadonly = globalThis as unknown as { readonlyDb?: PrismaClient };

function readonlyUrl(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (/[?&]connection_limit=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}connection_limit=1`;
}

const readonlyDb =
  globalForReadonly.readonlyDb ??
  // Failed queries are expected (the AI retries them), so don't log them
  new PrismaClient({ datasourceUrl: readonlyUrl(), log: [] });

if (process.env.NODE_ENV !== "production") globalForReadonly.readonlyDb = readonlyDb;

/** Runs one SELECT on the read-only connection. */
export async function readonlyQuery(sql: string): Promise<Record<string, unknown>[]> {
  // Re-applied every time: cheap, and survives the connection being reopened
  await readonlyDb.$queryRawUnsafe("PRAGMA query_only = 1");
  return readonlyDb.$queryRawUnsafe<Record<string, unknown>[]>(sql);
}
