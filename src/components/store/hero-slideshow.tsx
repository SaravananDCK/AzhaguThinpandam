"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Ambient background slideshow for the hero: slow crossfade + Ken Burns zoom.
// Sits behind the maroon overlay; content stays readable throughout.
const SLIDES = [
  { src: "/banners/hero.webp", position: "object-[70%_center]" },
  { src: "/banners/banner-pack.webp", position: "object-[62%_center]" },
  { src: "/banners/banner-family.webp", position: "object-[70%_center]" },
];
const INTERVAL_MS = 6500;

export function HeroSlideshow() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {SLIDES.map((slide, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slide.src}
          src={slide.src}
          alt=""
          loading={i === 0 ? "eager" : "lazy"}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-[1500ms] ease-in-out",
            slide.position,
            i === active
              ? "opacity-100 motion-safe:animate-kenburns"
              : "opacity-0"
          )}
        />
      ))}
    </div>
  );
}
