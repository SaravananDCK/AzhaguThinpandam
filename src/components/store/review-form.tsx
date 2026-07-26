"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ExistingReview = {
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
} | null;

export function ReviewForm({
  productId,
  existing,
}: {
  productId: string;
  existing: ExistingReview;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(existing === null);

  // Already submitted and not editing → show status instead of the form
  if (existing && !editing) {
    const label =
      existing.status === "APPROVED"
        ? "Your review is published. Thank you!"
        : existing.status === "REJECTED"
          ? "Your review wasn't published."
          : "Your review is awaiting approval.";
    return (
      <div className="rounded-xl border bg-secondary/30 p-4">
        <div className="flex items-center gap-2">
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
      toast.error("Please pick a star rating.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, title: title.trim(), body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not submit your review.");
        return;
      }
      toast.success("Thanks! Your review will appear once it's approved.");
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border p-4">
      <p className="font-semibold">{existing ? "Edit your review" : "Write a review"}</p>
      <div className="mt-3 space-y-4">
        <div className="grid gap-1.5">
          <Label>Your rating</Label>
          <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                className="p-0.5"
              >
                <Star
                  className={`size-7 transition-colors ${
                    n <= (hover || rating)
                      ? "fill-gold-500 text-gold-500"
                      : "text-muted-foreground/40"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rv-title">Title (optional)</Label>
          <Input
            id="rv-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Loved it!"
            maxLength={120}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rv-body">Your review (optional)</Label>
          <Textarea
            id="rv-body"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share what you liked about it…"
            maxLength={2000}
          />
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
    </div>
  );
}
