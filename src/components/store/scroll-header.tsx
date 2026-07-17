"use client";

import { useEffect, useState } from "react";

/**
 * Sticky header that compacts once the page is scrolled. Children opt in with
 * `group-data-[scrolled=true]/header:*` classes.
 */
export function ScrollHeader({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Hysteresis: the gap between the two thresholds must exceed the header's
    // height change (~80px), or shrinking shortens the page, snaps scrollY
    // back under the threshold and the header oscillates (visible flicker).
    const SHRINK_AT = 150;
    const EXPAND_AT = 20;
    let compact = false;
    const onScroll = () => {
      const y = window.scrollY;
      if (!compact && y > SHRINK_AT) {
        compact = true;
        setScrolled(true);
      } else if (compact && y < EXPAND_AT) {
        compact = false;
        setScrolled(false);
      }
    };
    const raf = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      // Transparent, click-through wrapper — the floating pill inside carries the
      // background/shadow and re-enables pointer events for its own area.
      className="group/header pointer-events-none sticky top-0 z-40"
    >
      {children}
    </header>
  );
}
