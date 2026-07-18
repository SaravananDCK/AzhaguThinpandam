// lucide-react dropped brand icons, so inline the Instagram glyph.
function IgIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

// A reel/post permalink -> Instagram's iframe embed endpoint.
// https://www.instagram.com/reel/CODE/ -> https://www.instagram.com/reel/CODE/embed
function toEmbedUrl(url: string): string {
  const clean = url.split(/[?#]/)[0].replace(/\/+$/, "");
  return `${clean}/embed`;
}

export function InstagramReels({ handle, reels }: { handle: string; reels: string[] }) {
  if (!handle && reels.length === 0) return null;
  const profileUrl = `https://www.instagram.com/${handle}/`;

  return (
    <section className="my-16 sm:my-20">
      <div className="mb-8 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold-600 dark:text-gold-400">
          Follow along
        </p>
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">From our Instagram</h2>
        {handle && (
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 font-medium text-primary hover:underline"
          >
            <IgIcon className="size-4" /> @{handle}
          </a>
        )}
      </div>

      {reels.length > 0 ? (
        <div className="grid justify-items-center gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reels.map((url) => (
            <div
              key={url}
              className="w-full max-w-[400px] overflow-hidden rounded-2xl border bg-card shadow-sm"
            >
              <iframe
                src={toEmbedUrl(url)}
                title="Instagram reel"
                loading="lazy"
                scrolling="no"
                className="block w-full"
                style={{ height: 620, border: "none" }}
                allow="encrypted-media; clipboard-write; picture-in-picture; web-share"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-b from-primary-600 to-primary-700 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-900/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
          >
            <IgIcon className="size-5" /> Watch our reels on Instagram
          </a>
        </div>
      )}
    </section>
  );
}
