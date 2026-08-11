import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye, Globe, ShoppingCart, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { summarizeTraffic, todayIST } from "@/lib/traffic";
import { TrafficCharts } from "@/components/admin/traffic-charts";

export const metadata: Metadata = { title: "Traffic" };
// Reads log files from disk — never cache a build-time snapshot.
export const dynamic = "force-dynamic";

function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function dayLabel(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function StatRow({ left, right }: { left: string; right: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="min-w-0 truncate font-mono text-muted-foreground">{left}</span>
      <span className="font-medium tabular-nums">{right}</span>
    </div>
  );
}

export default async function AdminTrafficPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { day: param } = await searchParams;
  const today = todayIST();
  const day = param === "all" || /^\d{4}-\d{2}-\d{2}$/.test(param ?? "") ? param! : today;
  const summary = summarizeTraffic(day);
  const label = day === "all" ? "all logs on disk" : dayLabel(day);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Traffic</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            From the Caddy access log. Page views exclude assets and API calls;
            visitors are unique IPs.
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* From the All-time view the left arrow steps back into day mode (at today). */}
          <Button asChild variant="ghost" size="icon" aria-label="Previous day">
            <Link href={`/admin/traffic?day=${day === "all" ? today : shiftDay(day, -1)}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <span className="min-w-28 text-center text-sm font-semibold">
            {day === "all" ? "All time" : dayLabel(day)}
          </span>
          <Button
            asChild={day !== "all" && day < today}
            variant="ghost"
            size="icon"
            aria-label="Next day"
            disabled={day === "all" || day >= today}
          >
            {day !== "all" && day < today ? (
              <Link href={`/admin/traffic?day=${shiftDay(day, 1)}`}>
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <ChevronRight className="size-4" />
            )}
          </Button>
          <Button asChild variant={day === "all" ? "secondary" : "outline"} size="sm">
            <Link href={day === "all" ? "/admin/traffic" : "/admin/traffic?day=all"}>
              All time
            </Link>
          </Button>
        </div>
      </div>

      {summary === null ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">No access logs found.</p>
            <p className="mx-auto mt-2 max-w-md">
              Logs are written by Caddy on the server into <code>logs/caddy/</code>{" "}
              and mounted into the app container. They don&apos;t exist on a dev
              machine — deploy and open this page on the VPS.
            </p>
          </CardContent>
        </Card>
      ) : summary.totalRequests === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {summary.unreadableFiles > 0 ? (
              <>
                <p className="font-medium text-destructive">
                  {summary.unreadableFiles} log file
                  {summary.unreadableFiles === 1 ? " is" : "s are"} unreadable —
                  likely a permissions problem.
                </p>
                <p className="mx-auto mt-2 max-w-lg">
                  Caddy writes logs as root with mode 600 unless the Caddyfile
                  sets <code>mode 644</code>. On the server, run{" "}
                  <code>chmod 644 logs/caddy/access*</code> once to fix existing
                  files.
                </p>
              </>
            ) : (
              <>No requests logged for {label}.</>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {summary.unreadableFiles > 0 && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
              {summary.unreadableFiles} log file
              {summary.unreadableFiles === 1 ? " was" : "s were"} skipped
              (unreadable) — numbers below are incomplete. Run{" "}
              <code>chmod 644 logs/caddy/access*</code> on the server.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Page views",
                value: summary.pageViews,
                sub: `${summary.totalRequests} requests in total`,
                icon: Eye,
              },
              {
                label: "Unique visitors",
                value: summary.uniqueVisitors,
                sub: "distinct IP addresses",
                icon: Users,
              },
              {
                label: "OTP requests",
                value: summary.otpRequests,
                sub: "OTP login attempts",
                icon: Globe,
              },
              {
                label: "Orders placed",
                value: summary.ordersPlaced,
                sub: "successful checkout calls",
                icon: ShoppingCart,
              },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.sub}</p>
                  </div>
                  <s.icon className="size-5 text-primary" />
                </CardContent>
              </Card>
            ))}
          </div>

          <TrafficCharts byHour={summary.byHour} />

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-2">
                <p className="mb-3 font-semibold">Top pages</p>
                {summary.topPages.map((p) => (
                  <StatRow key={p.path} left={p.path} right={p.views} />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2">
                <p className="mb-3 font-semibold">
                  Top visitors{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    (page views · unique pages)
                  </span>
                </p>
                {summary.topVisitors.map((v) => (
                  <StatRow key={v.ip} left={v.ip} right={`${v.hits} · ${v.pages}`} />
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-2">
                <p className="mb-3 font-semibold">Checkout funnel (page views)</p>
                {summary.funnel.map((f) => (
                  <StatRow key={f.path} left={f.path} right={f.views} />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2">
                <p className="mb-3 font-semibold">Errors (status ≥ 400)</p>
                {summary.errors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None — clean run.</p>
                ) : (
                  summary.errors.map((e) => (
                    <StatRow key={`${e.status}-${e.path}`} left={`${e.status} ${e.path}`} right={e.count} />
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="space-y-2">
              <p className="mb-3 font-semibold">Slowest requests</p>
              {summary.slowest.map((s, i) => (
                <StatRow
                  key={i}
                  left={`${s.status} ${s.path}`}
                  right={`${s.seconds.toFixed(2)}s`}
                />
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
