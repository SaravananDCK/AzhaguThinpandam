"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Img = { id: string; url: string };

export function ProductGallery({ images, alt }: { images: Img[]; alt: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div className="space-y-3">
      <div className="aspect-square overflow-hidden rounded-xl border bg-muted">
        {current && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.url} alt={alt} className="size-full object-cover" />
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "size-16 shrink-0 overflow-hidden rounded-lg border-2",
                i === active ? "border-primary" : "border-transparent"
              )}
              aria-label={`Image ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
