import Image from "next/image";
import { ArrowUpRight, Play } from "lucide-react";

function safeInstagramUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["instagram.com", "www.instagram.com"].includes(url.hostname)) return null;
    if (!/^\/(reel|reels|p)\/[^/]+\/?$/.test(url.pathname)) return null;
    return `${url.origin}${url.pathname}`;
  } catch { return null; }
}

/** Local kitchen previews keep third-party players off the shopping page. */
export function InstagramReels({ handle, reels }: { handle: string; reels: string[] }) {
  const cleanHandle = handle.trim().replace(/^@/, "");
  const validHandle = /^[a-zA-Z0-9_.]{1,30}$/.test(cleanHandle) ? cleanHandle : "";
  const links = [...new Set(reels.map(safeInstagramUrl).filter((url): url is string => !!url))];
  if (!validHandle && !links.length) return null;

  return (
    <section className="my-12 sm:my-16">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold-600 dark:text-gold-400">A little taste of our kitchen</p>
          <h2 className="font-heading text-3xl font-semibold sm:text-4xl">Fresh stories from Kovilpatti</h2>
          <p className="mt-3 text-sm text-muted-foreground">See how your favourite snacks come together on Instagram.</p>
        </div>
        {validHandle && <a href={`https://www.instagram.com/${validHandle}/`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 font-medium text-primary hover:underline">@{validHandle}<ArrowUpRight className="size-4" /><span className="sr-only"> (opens Instagram in a new tab)</span></a>}
      </div>
      {links.length > 0 && <div className="grid gap-4 sm:grid-cols-3">
        {links.slice(0, 3).map((url, i) => (
          <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg">
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
              <Image src={`/showcase/showcase-${i + 1}.webp`} alt="Snacks from our Kovilpatti kitchen" fill sizes="(max-width: 639px) 100vw, (max-width: 1152px) 33vw, 365px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary"><Play className="size-4" />Watch reel {i + 1}</span>
            </div>
            <p className="flex items-center justify-between p-4 text-sm text-muted-foreground">Open on Instagram<ArrowUpRight className="size-4" /><span className="sr-only"> (opens in a new tab)</span></p>
          </a>
        ))}
      </div>}
    </section>
  );
}
