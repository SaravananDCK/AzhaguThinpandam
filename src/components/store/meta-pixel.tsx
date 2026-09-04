"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

// `window.fbq` is typed in src/lib/fbq.ts, alongside the tracking helpers.

/**
 * Meta Pixel base code — the standard snippet, with the id injected from the
 * `meta_pixel_id` setting. Rendered from the store layout, so it loads on every
 * customer-facing page (the admin panel has its own layout and never gets it).
 *
 * The snippet's own `fbq('track', 'PageView')` only fires on a full page load.
 * App Router navigations are client-side, so the effect below fires one for
 * each subsequent route — without it the pixel would only ever see landings.
 */
export function MetaPixel({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();
  // The base snippet already counted the page we loaded on.
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(pixelId)});
fbq('track', 'PageView');`}
    </Script>
  );
}

/** The <noscript> half of the snippet — static markup, server-rendered as-is. */
export function MetaPixelNoScript({ pixelId }: { pixelId: string }) {
  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        alt=""
        src={`https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`}
      />
    </noscript>
  );
}
