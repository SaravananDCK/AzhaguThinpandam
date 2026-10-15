"use client";

import Image, { type ImageProps } from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";

/** Resize local uploads and give missing catalog photos a neutral placeholder. */
export function StoreImage({ alt, ...props }: ImageProps) {
  const [failedSrc, setFailedSrc] = useState<ImageProps["src"] | null>(null);
  const local = typeof props.src === "string" && props.src.startsWith("/") && !props.src.startsWith("//");
  if (failedSrc === props.src) {
    return (
      <div role="img" aria-label={`${alt} — photo unavailable`} className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted p-3 text-center text-muted-foreground">
        <ImageOff className="size-7" aria-hidden="true" />
        <span className="text-xs">Photo unavailable</span>
      </div>
    );
  }
  return <Image {...props} alt={alt} unoptimized={!local} onError={() => setFailedSrc(props.src)} />;
}
