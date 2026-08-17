"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FilterGroup = { key: string; name: string; lineCount: number };

/**
 * Screen-only chips that choose which groups the printed sheet covers. The
 * selection lives in the URL (?hide=), so the print output and a shared link
 * both reflect it. Merchandise starts hidden — see the page for why.
 */
export function GroupFilter({
  groups,
  hidden,
}: {
  groups: FilterGroup[];
  hidden: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function toggle(key: string) {
    const next = hidden.includes(key)
      ? hidden.filter((k) => k !== key)
      : [...hidden, key];
    const q = new URLSearchParams(params.toString());
    // An explicit empty value still means "hide nothing" — dropping the param
    // would fall back to the merchandise-hidden default instead.
    q.set("hide", next.join(","));
    router.replace(`?${q.toString()}`, { scroll: false });
  }

  if (groups.length < 2) return null;

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Include:</span>
      {groups.map((g) => {
        const on = !hidden.includes(g.key);
        return (
          <button key={g.key} type="button" onClick={() => toggle(g.key)}>
            <Badge
              variant={on ? "default" : "outline"}
              className={cn("px-3 py-1.5", !on && "text-muted-foreground hover:bg-accent")}
            >
              {g.name} ({g.lineCount})
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
