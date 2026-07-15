"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

function SearchBoxInner({ onSubmitted }: { onSubmitted?: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  return (
    <form
      className="group relative"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : "/products");
        onSubmitted?.();
      }}
    >
      <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-all duration-300 group-focus-within:scale-110 group-focus-within:text-primary-500" />
      <Input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search snacks…"
        className="h-10 w-full rounded-xl border-2 bg-muted/50 pl-10 transition-all duration-300 focus-visible:border-primary-500 focus-visible:shadow-[0_0_20px_rgba(207,68,68,0.2)] focus-visible:ring-primary-500/20 focus-visible:ring-4"
        aria-label="Search products"
      />
    </form>
  );
}

export function SearchBox(props: { onSubmitted?: () => void }) {
  return (
    <Suspense fallback={null}>
      <SearchBoxInner {...props} />
    </Suspense>
  );
}
