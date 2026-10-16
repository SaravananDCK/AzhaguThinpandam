"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Announcement } from "@/lib/announcement";

const KEY = "announcement-dismissed";
const listeners = new Set<() => void>();

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}
function dismiss(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Private mode — the notice will simply show again next page
  }
  listeners.forEach((fn) => fn());
}

/**
 * Pop-up shown once per visitor on arrival (holiday closures, courier delays…).
 * Closing it is remembered in the browser against the notice's content id, so
 * an edited notice shows again and an unchanged one stays away. The server
 * renders it closed and the browser opens it after hydration, which avoids a
 * mismatch and keeps it out of the HTML crawlers see.
 */
export function AnnouncementDialog({ announcement }: { announcement: Announcement }) {
  const dismissed = useSyncExternalStore(subscribe, read, () => announcement.id);
  const open = dismissed !== announcement.id;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss(announcement.id)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-md" showCloseButton>
        {announcement.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={announcement.image}
            alt=""
            className="aspect-[4/3] w-full rounded-t-xl object-cover"
          />
        )}
        <div className="space-y-4 p-6 pt-5 text-center">
          <DialogHeader className="items-center text-center">
            {announcement.title ? (
              <DialogTitle className="font-heading text-2xl font-semibold text-primary">
                {announcement.title}
              </DialogTitle>
            ) : (
              <DialogTitle className="sr-only">Announcement</DialogTitle>
            )}
            {announcement.body ? (
              <DialogDescription className="whitespace-pre-line text-base leading-relaxed text-foreground/90">
                {announcement.body}
              </DialogDescription>
            ) : (
              <DialogDescription className="sr-only">Store announcement</DialogDescription>
            )}
          </DialogHeader>
          <Button className="rounded-full px-8" onClick={() => dismiss(announcement.id)}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
