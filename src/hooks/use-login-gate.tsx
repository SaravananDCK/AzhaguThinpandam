"use client";

import { useRef, useState } from "react";
import { useAuthed } from "@/hooks/use-authed";
import { LoginDialog } from "@/components/store/login-dialog";

/**
 * Runs an action only for logged-in customers, opening the OTP dialog first
 * when there's no session and continuing the action after a successful login.
 * Used by every add-to-cart surface so an anonymous cart never exists — which
 * is what makes the server-side cart mirror (and abandoned-cart follow-up)
 * complete.
 */
export function useLoginGate() {
  const check = useAuthed((s) => s.check);
  const setAuthed = useAuthed((s) => s.setAuthed);
  const [open, setOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  function gate(action: () => void) {
    void (async () => {
      if (await check()) {
        action();
        return;
      }
      pending.current = action;
      setOpen(true);
    })();
  }

  const dialog = (
    <LoginDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) pending.current = null; // dismissed — drop the queued action
      }}
      onSuccess={() => {
        setAuthed(true);
        setOpen(false);
        const run = pending.current;
        pending.current = null;
        run?.();
      }}
    />
  );

  return { gate, dialog };
}
