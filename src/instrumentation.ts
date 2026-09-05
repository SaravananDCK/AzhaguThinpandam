import type { Instrumentation } from "next";

/**
 * Next.js calls this for every error it catches while serving a request — a
 * page render, a route handler or a server action — so nothing needs its own
 * try/catch to reach the error log. Browser-side crashes are reported
 * separately by src/app/error.tsx through /api/client-error.
 *
 * The log module uses node:fs, so it is imported lazily and only on the Node
 * runtime (this file is also bundled for the edge runtime).
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logError } = await import("./lib/log");
  await logError("server", `${context.routerKind} ${context.routeType} ${context.routePath}`, err, {
    url: request.path,
    method: request.method,
    userAgent: headerValue(request.headers["user-agent"]),
    ip: headerValue(request.headers["x-forwarded-for"])?.split(",")[0]?.trim(),
    extra: { renderSource: context.renderSource, revalidateReason: context.revalidateReason },
  });
};

function headerValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
