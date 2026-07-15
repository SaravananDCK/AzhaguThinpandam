"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Hydration-safe "is this mounted on the client?" flag.
 * Returns false during SSR/hydration, true after — without a setState-in-effect.
 * Used to defer rendering of localStorage-backed state (the cart).
 */
export function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}
