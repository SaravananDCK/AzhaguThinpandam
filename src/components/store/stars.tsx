import { Star } from "lucide-react";

/** Read-only star rating with fractional fill (e.g. 4.3 → 86% gold). */
export function Stars({
  value,
  size = 16,
  className = "",
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (filled: boolean) =>
    [0, 1, 2, 3, 4].map((i) => (
      <Star
        key={i}
        strokeWidth={1.5}
        style={{ width: size, height: size }}
        className={`shrink-0 ${filled ? "fill-current" : ""}`}
      />
    ));

  return (
    <span
      className={`relative inline-flex ${className}`}
      style={{ width: size * 5, height: size }}
      aria-hidden
    >
      <span className="flex text-muted-foreground/35">{row(false)}</span>
      <span
        className="absolute left-0 top-0 flex overflow-hidden text-gold-500"
        style={{ width: `${pct}%` }}
      >
        <span className="flex" style={{ width: size * 5 }}>
          {row(true)}
        </span>
      </span>
    </span>
  );
}
