import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

// Summaries over the Caddy access log (deploy/Caddyfile `log` block, JSON
// lines). The server-side twin of deploy/traffic.sh — keep the two in sync.

// In production the compose file mounts the host's ./logs/caddy read-only at
// this path; in dev the directory usually doesn't exist and the page shows an
// empty state.
const LOG_DIR = process.env.CADDY_LOG_DIR ?? path.join(process.cwd(), "logs", "caddy");

// The VPS runs UTC but the shop and its customers are in IST.
const IST_OFFSET_S = 5.5 * 60 * 60;

// Page views = HTML documents. Every other line is an image, a JS chunk or an
// API call, and counting those would make 20 visitors look like 4,000 "hits".
const ASSET_RE = /^\/(_next|uploads|api|favicon|logo|.*\.(png|jpg|jpeg|webp|svg|ico|css|js|woff2?)$)/;

export const FUNNEL_PATHS = ["/", "/products", "/cart", "/checkout", "/login", "/account/orders"];

type AccessEntry = {
  ts: number; // unix seconds (float)
  status: number;
  duration: number; // seconds
  request: { remote_ip: string; uri: string };
};

export type TrafficSummary = {
  /** Log files present but unreadable (usually a permissions problem) */
  unreadableFiles: number;
  totalRequests: number;
  pageViews: number;
  uniqueVisitors: number;
  ordersPlaced: number;
  otpRequests: number;
  /** All 24 IST hours, zero-filled */
  byHour: { hour: string; views: number; visitors: number }[];
  topPages: { path: string; views: number }[];
  topVisitors: { ip: string; pages: number; hits: number }[];
  errors: { status: number; path: string; count: number }[];
  slowest: { seconds: number; status: number; path: string }[];
  funnel: { path: string; views: number }[];
};

export function istDayOf(tsSeconds: number): string {
  return new Date((tsSeconds + IST_OFFSET_S) * 1000).toISOString().slice(0, 10);
}

export function todayIST(): string {
  return istDayOf(Date.now() / 1000);
}

function istHourOf(tsSeconds: number): number {
  return new Date((tsSeconds + IST_OFFSET_S) * 1000).getUTCHours();
}

function stripQuery(uri: string): string {
  const q = uri.indexOf("?");
  return q === -1 ? uri : uri.slice(0, q);
}

/** null = the log directory doesn't exist (not deployed / dev machine). */
function readEntries(): { entries: AccessEntry[]; unreadable: number } | null {
  if (!existsSync(LOG_DIR)) return null;
  const chunks: string[] = [];
  let unreadable = 0;
  for (const name of readdirSync(LOG_DIR)) {
    if (!name.startsWith("access")) continue;
    const file = path.join(LOG_DIR, name);
    try {
      chunks.push(
        name.endsWith(".gz")
          ? gunzipSync(readFileSync(file)).toString("utf8")
          : readFileSync(file, "utf8")
      );
    } catch {
      // Usually EACCES (Caddy writes 0600 unless the Caddyfile sets mode 644);
      // can also be a file vanishing mid-roll. Count it so the page can say so.
      unreadable++;
    }
  }
  const entries: AccessEntry[] = [];
  for (const chunk of chunks) {
    for (const line of chunk.split("\n")) {
      if (!line) continue;
      try {
        const e = JSON.parse(line) as AccessEntry;
        if (typeof e.ts === "number" && typeof e.request?.uri === "string") entries.push(e);
      } catch {
        // Torn line at a roll boundary.
      }
    }
  }
  return { entries, unreadable };
}

function top<T>(counts: Map<string, T>, cmp: (a: T, b: T) => number, n: number): [string, T][] {
  return [...counts.entries()].sort((a, b) => cmp(a[1], b[1])).slice(0, n);
}

/** @param day an IST day ("2026-08-05") or "all" for every log on disk */
export function summarizeTraffic(day: string): TrafficSummary | null {
  const read = readEntries();
  if (read === null) return null;
  const entries =
    day === "all" ? read.entries : read.entries.filter((e) => istDayOf(e.ts) === day);

  const pages = entries.filter((e) => !ASSET_RE.test(e.request.uri));

  const hourViews = new Array<number>(24).fill(0);
  const hourIps: Set<string>[] = Array.from({ length: 24 }, () => new Set());
  const pageCounts = new Map<string, number>();
  const visitorPages = new Map<string, Map<string, number>>();
  for (const e of pages) {
    const h = istHourOf(e.ts);
    hourViews[h]++;
    hourIps[h].add(e.request.remote_ip);
    const p = stripQuery(e.request.uri);
    pageCounts.set(p, (pageCounts.get(p) ?? 0) + 1);
    let perIp = visitorPages.get(e.request.remote_ip);
    if (!perIp) visitorPages.set(e.request.remote_ip, (perIp = new Map()));
    perIp.set(p, (perIp.get(p) ?? 0) + 1);
  }

  const errorCounts = new Map<string, number>();
  for (const e of entries) {
    if (e.status >= 400) {
      const key = `${e.status} ${stripQuery(e.request.uri)}`;
      errorCounts.set(key, (errorCounts.get(key) ?? 0) + 1);
    }
  }

  return {
    unreadableFiles: read.unreadable,
    totalRequests: entries.length,
    pageViews: pages.length,
    uniqueVisitors: new Set(entries.map((e) => e.request.remote_ip)).size,
    ordersPlaced: entries.filter(
      (e) => e.request.uri.startsWith("/api/checkout") && e.status === 200
    ).length,
    otpRequests: entries.filter((e) => e.request.uri.startsWith("/api/otp/request")).length,
    byHour: hourViews.map((views, h) => ({
      hour: `${String(h).padStart(2, "0")}:00`,
      views,
      visitors: hourIps[h].size,
    })),
    topPages: top(pageCounts, (a, b) => b - a, 15).map(([p, views]) => ({ path: p, views })),
    topVisitors: [...visitorPages.entries()]
      .map(([ip, perIp]) => ({
        ip,
        pages: perIp.size,
        hits: [...perIp.values()].reduce((s, n) => s + n, 0),
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 15),
    errors: top(errorCounts, (a, b) => b - a, 20).map(([key, count]) => {
      const sp = key.indexOf(" ");
      return { status: Number(key.slice(0, sp)), path: key.slice(sp + 1), count };
    }),
    slowest: [...entries]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map((e) => ({ seconds: e.duration, status: e.status, path: stripQuery(e.request.uri) })),
    funnel: FUNNEL_PATHS.map((p) => ({ path: p, views: pageCounts.get(p) ?? 0 })),
  };
}
