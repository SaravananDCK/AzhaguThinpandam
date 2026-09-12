"use client";

import { create } from "zustand";

type AuthedState = {
  /** null = not checked yet */
  authed: boolean | null;
  setAuthed: (v: boolean) => void;
  /**
   * Resolves the current session state. Cached after the first server check;
   * pass `force` to ask the server again — the gate does this before showing
   * a login dialog, because a "logged out" answer can be stale (the customer
   * logged in on /login and came back by client-side navigation).
   */
  check: (force?: boolean) => Promise<boolean>;
};

let inflight: Promise<boolean> | null = null;

/**
 * Shared "is there a customer session?" state, so the add-to-cart gate and
 * the cart mirror agree without each fetching /api/auth/session separately.
 */
export const useAuthed = create<AuthedState>((set, get) => ({
  authed: null,
  setAuthed: (v) => set({ authed: v }),
  check: (force = false) => {
    const { authed } = get();
    if (authed !== null && !force) return Promise.resolve(authed);
    inflight ??= fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        const v = Boolean(s?.user?.id);
        set({ authed: v });
        return v;
      })
      .catch(() => false) // on error assume logged out; the gate will verify
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },
}));
