import { accessSync, constants, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { appendFile, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { istDayOf } from "@/lib/traffic";

// The application error log: one JSON line per error, one file per IST day,
// under logs/app (APP_LOG_DIR in the container — a writable host mount, see
// docker-compose.yml). Read by the admin Errors page, or on the server with:
//   tail -f logs/app/errors-*.jsonl | jq -r '"\(.time) [\(.source)] \(.message) \(.url // "")"'
//
// Server-side only (node:fs). Every write is also mirrored to console.error so
// `docker compose logs app` keeps showing what it always has.

// turbopackIgnore stops the build tracing the whole project as a dependency
// of this path (same trick as uploads.ts).
const LOG_DIR =
  process.env.APP_LOG_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), "logs", "app");
const RETENTION_DAYS = 14;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;
const FILE_RE = /^errors-(\d{4}-\d{2}-\d{2})\.jsonl$/;

export type ErrorEntry = {
  /** ISO timestamp */
  time: string;
  /** Where it came from: "server" (Next's onRequestError), "client" (browser error boundary), or a subsystem ("otp", "checkout", "webhook"…) */
  source: string;
  message: string;
  stack?: string;
  /** Next.js error digest — the same value appears in the browser boundary and in onRequestError, so it joins the two entries */
  digest?: string;
  url?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  extra?: Record<string, unknown>;
};

let lastPrune = 0;
let dirFailureLogged = false;

function fileFor(time: Date): string {
  return path.join(LOG_DIR, `errors-${istDayOf(time.getTime() / 1000)}.jsonl`);
}

function serializeError(err: unknown): { message: string; stack?: string; digest?: string } {
  if (err instanceof Error) {
    const digest = (err as { digest?: unknown }).digest;
    return {
      message: err.message || err.name,
      stack: err.stack,
      digest: typeof digest === "string" ? digest : undefined,
    };
  }
  if (typeof err === "string") return { message: err };
  try {
    return { message: JSON.stringify(err) };
  } catch {
    return { message: String(err) };
  }
}

async function pruneOldFiles(): Promise<void> {
  const now = Date.now();
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  const cutoff = istDayOf((now - RETENTION_DAYS * 24 * 60 * 60 * 1000) / 1000);
  let names: string[];
  try {
    names = await readdir(LOG_DIR);
  } catch {
    return;
  }
  for (const name of names) {
    const m = FILE_RE.exec(name);
    if (m && m[1] < cutoff) await unlink(path.join(LOG_DIR, name)).catch(() => {});
  }
}

/**
 * Record an error. Never throws and never rejects — logging must not be able
 * to break the request that triggered it.
 *
 * @param source subsystem tag ("otp", "checkout", …) — see ErrorEntry.source
 * @param message what failed, in words (the error's own message goes in `stack`/`message` fields via `err`)
 * @param err the caught value, if any
 * @param extra request context: url, method, ip, userAgent, userId, or anything else worth keeping
 */
export async function logError(
  source: string,
  message: string,
  err?: unknown,
  extra: Partial<Omit<ErrorEntry, "time" | "source" | "message">> = {},
): Promise<void> {
  const time = new Date();
  const detail = err === undefined ? undefined : serializeError(err);
  const entry: ErrorEntry = {
    time: time.toISOString(),
    source,
    message: detail && detail.message && detail.message !== message ? `${message}: ${detail.message}` : message,
    ...(detail?.stack && { stack: detail.stack }),
    ...(detail?.digest && { digest: detail.digest }),
    ...extra,
  };
  // Keep stdout useful on its own.
  if (err === undefined) console.error(`[${source}] ${message}`);
  else console.error(`[${source}] ${message}:`, err);

  try {
    if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
    await appendFile(fileFor(time), JSON.stringify(entry) + "\n", "utf8");
    void pruneOldFiles();
  } catch (e) {
    // Usually EACCES: the host directory was created by root before the
    // container (uid 1000) could. Say so once, then stay quiet.
    if (!dirFailureLogged) {
      dirFailureLogged = true;
      console.error(`[log] cannot write ${LOG_DIR} — errors go to stdout only. Fix: chown 1000:1000 logs/app`, e);
    }
  }
}

export type ErrorLogStatus = {
  /** null = the directory doesn't exist (dev machine, or first deploy before the mount) */
  exists: boolean;
  writable: boolean;
  dir: string;
};

export function errorLogStatus(): ErrorLogStatus {
  if (!existsSync(LOG_DIR)) return { exists: false, writable: false, dir: LOG_DIR };
  try {
    accessSync(LOG_DIR, constants.W_OK);
    return { exists: true, writable: true, dir: LOG_DIR };
  } catch {
    return { exists: true, writable: false, dir: LOG_DIR };
  }
}

/** Days that have a log file, newest first. */
export function errorLogDays(): string[] {
  if (!existsSync(LOG_DIR)) return [];
  return readdirSync(LOG_DIR)
    .map((n) => FILE_RE.exec(n)?.[1])
    .filter((d): d is string => !!d)
    .sort()
    .reverse();
}

/**
 * Entries for one IST day ("2026-09-05") or "all", newest first.
 * Torn or foreign lines are skipped.
 */
export function readErrors(day: string): ErrorEntry[] {
  if (!existsSync(LOG_DIR)) return [];
  const files = readdirSync(LOG_DIR).filter((n) => {
    const m = FILE_RE.exec(n);
    return m && (day === "all" || m[1] === day);
  });
  const entries: ErrorEntry[] = [];
  for (const name of files) {
    let text: string;
    try {
      text = readFileSync(path.join(LOG_DIR, name), "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      if (!line) continue;
      try {
        const e = JSON.parse(line) as ErrorEntry;
        if (typeof e.time === "string" && typeof e.message === "string") entries.push(e);
      } catch {
        // torn line
      }
    }
  }
  return entries.sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0));
}
