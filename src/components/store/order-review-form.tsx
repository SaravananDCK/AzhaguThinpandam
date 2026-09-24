"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ExistingOrderReview = {
  rating: number;
  tasteRating: number | null;
  packingRating: number | null;
  deliveryRating: number | null;
  authorName: string | null;
  title: string | null;
  body: string | null;
  status: string;
} | null;

/** Row of five tappable stars. `size` is the icon class. */
function StarPicker({
  value,
  onChange,
  label,
  size = "size-7",
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  size?: string;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          // Tapping the current value again clears an optional rating
          onClick={() => onChange(value === n ? 0 : n)}
          onMouseEnter={() => setHover(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className="p-0.5"
        >
          <Star
            className={`${size} transition-colors ${
              n <= (hover || value) ? "fill-gold-500 text-gold-500" : "text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const ASPECTS = [
  { key: "taste", label: "Taste & freshness" },
  { key: "packing", label: "Packing" },
  { key: "delivery", label: "Delivery" },
] as const;

type AspectKey = (typeof ASPECTS)[number]["key"];

/**
 * Review of a whole delivered order — overall stars plus optional taste /
 * packing / delivery ratings. No sign-in: the order page's link is the access.
 */
export function OrderReviewForm({
  orderNumber,
  defaultName,
  existing,
}: {
  orderNumber: string;
  defaultName: string;
  existing: ExistingOrderReview;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [aspects, setAspects] = useState<Record<AspectKey, number>>({
    taste: existing?.tasteRating ?? 0,
    packing: existing?.packingRating ?? 0,
    delivery: existing?.deliveryRating ?? 0,
  });
  const [name, setName] = useState(existing?.authorName ?? defaultName);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(existing === null);

  if (existing && !editing) {
    const label =
      existing.status === "APPROVED"
        ? "Your review is published. Thank you!"
        : existing.status === "REJECTED"
          ? "Your review wasn't published."
          : "Thanks! Your review is awaiting approval.";
    return (
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex text-gold-500">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`size-4 ${n <= existing.rating ? "fill-current" : "text-muted-foreground/30"}`}
              />
            ))}
          </span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setEditing(true)}>
          Edit your review
        </Button>
      </div>
    );
  }

  async function submit() {
    if (rating < 1) {
      toast.error("Please pick an overall star rating.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderNumber}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          tasteRating: aspects.taste || null,
          packingRating: aspects.packing || null,
          deliveryRating: aspects.delivery || null,
          authorName: name.trim(),
          title: title.trim(),
          body: body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not submit your review.");
        return;
      }
      toast.success("Thank you! Your review will appear once it's approved.");
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-1.5">
        <Label>Overall, how was your order?</Label>
        <StarPicker value={rating} onChange={setRating} label="Overall rating" />
      </div>

      <div className="grid gap-2 rounded-lg bg-secondary/40 p-3">
        <p className="text-xs text-muted-foreground">Rate each part (optional)</p>
        {ASPECTS.map((a) => (
          <div key={a.key} className="flex items-center justify-between gap-3">
            <span className="text-sm">{a.label}</span>
            <StarPicker
              value={aspects[a.key]}
              onChange={(n) => setAspects((s) => ({ ...s, [a.key]: n }))}
              label={a.label}
              size="size-5"
            />
          </div>
        ))}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="orv-body">Tell us more (optional)</Label>
        <Textarea
          id="orv-body"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What did you enjoy? How was the packing and delivery?"
          maxLength={2000}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="orv-title">Headline (optional)</Label>
          <Input
            id="orv-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tasted just like home!"
            maxLength={120}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="orv-name">Name to show</Label>
          <Input
            id="orv-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />} Submit review
        </Button>
        {existing && (
          <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
