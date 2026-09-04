/**
 * Meta Pixel helpers. The base snippet is injected by
 * `src/components/store/meta-pixel.tsx` from the `meta_pixel_id` setting, so
 * `window.fbq` only exists on customer-facing pages of a live store — every
 * call here is a no-op otherwise.
 */

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[] };
    _fbq?: unknown;
  }
}

const WAIT_MS = 5000;
const POLL_MS = 250;

/**
 * Resolves with `window.fbq` once the base snippet has run, or `undefined` if
 * it never does (pixel not configured, or blocked). The snippet loads
 * `afterInteractive`, so effects on a hard page load can beat it — firing
 * blindly would silently drop the event.
 */
export async function waitForFbq(): Promise<Window["fbq"]> {
  if (typeof window === "undefined") return undefined;
  for (let waited = 0; !window.fbq && waited < WAIT_MS; waited += POLL_MS) {
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return window.fbq;
}

/** Fire-and-forget standard event. Safe to call from a click handler. */
export function trackFbq(event: string, params?: Record<string, unknown>): void {
  void waitForFbq().then((fbq) => fbq?.("track", event, params));
}

/** One line of a `contents` array — the shape Meta expects for a product. */
export type FbqContent = {
  id: string;
  quantity: number;
  item_price: number; // rupees, not paise
};
