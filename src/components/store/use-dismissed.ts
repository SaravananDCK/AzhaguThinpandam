"use client";

import { useSyncExternalStore } from "react";

// Remembers, per browser, that a pop-up was closed — keyed by the pop-up's
// content id, so an edited notice shows again and an unchanged one stays away.
// The server renders every pop-up closed (the snapshot equals the id) and the
// browser opens it after hydration, which avoids a mismatch and keeps it out
// of the HTML crawlers see.

const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

/** Marks the pop-up stored under `key` as closed for content `id`. */
export function dismissPopup(key: string, id: string) {
  try {
    localStorage.setItem(key, id);
  } catch {
    // Private mode — the notice will simply show again next page
  }
  listeners.forEach((fn) => fn());
}

/** True once the pop-up under `key` was closed for exactly this content `id`. */
export function useDismissed(key: string, id: string): boolean {
  const stored = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) ?? "";
      } catch {
        return "";
      }
    },
    () => id
  );
  return stored === id;
}
