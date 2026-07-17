"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/store/search-box";

/**
 * Search as a pill-friendly icon that reveals the search field in a small panel
 * below the nav, so the floating pill stays compact.
 */
export function NavSearch() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Search"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full transition-transform hover:scale-110 active:scale-95"
      >
        {open ? <X className="size-5" /> : <Search className="size-5" />}
      </Button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+0.85rem)] z-50 w-72 rounded-2xl border border-border/60 bg-background/95 p-3 shadow-xl backdrop-blur-xl">
          <SearchBox onSubmitted={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
