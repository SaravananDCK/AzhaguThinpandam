/**
 * Browser side of the error log: called from the error boundaries so a crash
 * on a customer's device reaches /admin/errors. Best-effort — never throws.
 */
let lastKey = "";
let lastAt = 0;

export function reportClientError(error: Error & { digest?: string }): void {
  if (typeof window === "undefined") return;
  try {
    // The boundary's effect can fire twice for one crash (React strict mode,
    // a retry that fails the same way) — one report per crash is enough.
    const key = `${error.digest ?? ""}|${error.message}`;
    if (key === lastKey && Date.now() - lastAt < 5000) return;
    lastKey = key;
    lastAt = Date.now();
    const html = document.documentElement;
    const body = JSON.stringify({
      message: (error.message || error.name || "Unknown error").slice(0, 500),
      stack: error.stack?.slice(0, 4000),
      digest: error.digest,
      url: location.href.slice(0, 500),
      // Chrome adds these classes when it translates a page.
      translated: html.classList.contains("translated-ltr") || html.classList.contains("translated-rtl"),
      lang: html.lang || undefined,
    });
    // keepalive lets the request finish even if the user navigates away.
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never let reporting cause a second crash
  }
}
