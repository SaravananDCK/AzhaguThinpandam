import { cn } from "@/lib/utils";

/**
 * Fades content up on load. Deliberately CSS-only and NOT a client component:
 * the animation runs the moment the stylesheet parses, so server-rendered
 * content is readable without waiting for the JS bundle.
 *
 * This used to be an IntersectionObserver in a useEffect with `opacity: 0` in
 * CSS, which meant every wrapped block stayed invisible until ~776 KB of
 * JavaScript downloaded and hydrated — a blank white page for the better part
 * of a minute on a slow mobile connection. Content is now visible by default
 * and the animation is pure enhancement, so a slow or failed script load can
 * never blank the page again.
 *
 * `delay` staggers items in a grid (milliseconds).
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn("reveal", className)}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
