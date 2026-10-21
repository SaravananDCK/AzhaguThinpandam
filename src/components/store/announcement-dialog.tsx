"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Announcement } from "@/lib/announcement";
import { dismissPopup, useDismissed } from "@/components/store/use-dismissed";

const KEY = "announcement-dismissed";

/**
 * Pop-up shown once per visitor on arrival (holiday closures, courier delays…).
 * Closing it is remembered in the browser against the notice's content id (see
 * use-dismissed.ts).
 */
export function AnnouncementDialog({ announcement }: { announcement: Announcement }) {
  const open = !useDismissed(KEY, announcement.id);
  const close = () => dismissPopup(KEY, announcement.id);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-md" showCloseButton>
        {announcement.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={announcement.image}
            alt=""
            className="h-auto w-full rounded-t-xl"
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
          <Button className="rounded-full px-8" onClick={close}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
