"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveSettings } from "./actions";

type Props = {
  values: {
    storeName: string;
    storePhone: string;
    storeEmail: string;
    storeAddress: string;
    shippingFeeRupees: string;
    freeShippingAboveRupees: string;
    lowStockThreshold: string;
    boxTiers: string;
    packingCostRupees: string;
    roundToFive: boolean;
    instagramHandle: string;
    instagramReels: string;
    preLaunchNotice: string;
  };
};

export function SettingsForm({ values }: Props) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await saveSettings(formData);
      if (res.error) toast.error(res.error);
      else toast.success("Settings saved");
    });
  }

  return (
    <form action={handleSubmit} className="max-w-xl space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <p className="font-semibold">Store details</p>
          <div className="grid gap-2">
            <Label htmlFor="s-name">Store name</Label>
            <Input id="s-name" name="storeName" defaultValue={values.storeName} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="s-phone">Contact phone</Label>
              <Input id="s-phone" name="storePhone" defaultValue={values.storePhone} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="s-email">Contact email</Label>
              <Input
                id="s-email"
                name="storeEmail"
                type="email"
                defaultValue={values.storeEmail}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s-address">Store address (shown in footer)</Label>
            <Textarea
              id="s-address"
              name="storeAddress"
              rows={2}
              defaultValue={values.storeAddress}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <p className="font-semibold">Shipping & stock</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="s-fee">Shipping fee ₹</Label>
              <Input
                id="s-fee"
                name="shippingFee"
                type="number"
                min="0"
                step="0.01"
                defaultValue={values.shippingFeeRupees}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="s-free">Free shipping above ₹</Label>
              <Input
                id="s-free"
                name="freeShippingAbove"
                type="number"
                min="0"
                step="0.01"
                defaultValue={values.freeShippingAboveRupees}
              />
              <p className="text-xs text-muted-foreground">0 disables free shipping.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="s-lowstock">Low stock alert at</Label>
              <Input
                id="s-lowstock"
                name="lowStockThreshold"
                type="number"
                min="0"
                defaultValue={values.lowStockThreshold}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="roundToFive"
              defaultChecked={values.roundToFive}
              className="size-4 accent-primary"
            />
            Round computed sale prices UP to the next ₹5 (₹88 → ₹90)
          </label>
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="s-packing">Packing cost per order ₹ (internal)</Label>
            <Input
              id="s-packing"
              name="packingCost"
              type="number"
              min="0"
              step="0.01"
              defaultValue={values.packingCostRupees}
            />
            <p className="text-xs text-muted-foreground">
              Recorded on each new order for the P&amp;L — never charged to the customer.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <p className="font-semibold">Build-your-box discounts</p>
          <div className="grid gap-2">
            <Label htmlFor="s-tiers">Weight discount tiers</Label>
            <Input id="s-tiers" name="boxTiers" defaultValue={values.boxTiers} />
            <p className="text-xs text-muted-foreground">
              Format: <code>kg:percent</code> pairs separated by commas — e.g.{" "}
              <code>1:10,2:15,3:20</code> means 1&nbsp;kg+ → 10% off, 2&nbsp;kg+ → 15%,
              3&nbsp;kg+ → 20%. Fractional kg allowed (e.g. <code>0.5:5</code>). Based on
              the cart&apos;s total weight, applied to the whole order. Leave empty to disable.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <p className="font-semibold">Pre-launch notice</p>
          <div className="grid gap-2">
            <Label htmlFor="s-prelaunch">Order-time message</Label>
            <Textarea
              id="s-prelaunch"
              name="preLaunchNotice"
              rows={2}
              defaultValue={values.preLaunchNotice}
              placeholder="Our grand inauguration is on 3rd August 2026!"
            />
            <p className="text-xs text-muted-foreground">
              While this is set, clicking <strong>Pay</strong> shows this message instead of taking
              payment. <strong>Clear the box and save</strong> to enable real checkout once your
              payment gateway is live.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <p className="font-semibold">Instagram (homepage)</p>
          <div className="grid gap-2">
            <Label htmlFor="s-ig-handle">Instagram handle</Label>
            <Input
              id="s-ig-handle"
              name="instagramHandle"
              defaultValue={values.instagramHandle}
              placeholder="azhagintamilmozhi05"
            />
            <p className="text-xs text-muted-foreground">
              Username only, without the @. Used for the &ldquo;Follow&rdquo; link. Leave empty to
              hide the section.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s-ig-reels">Featured reel / post links</Label>
            <Textarea
              id="s-ig-reels"
              name="instagramReels"
              rows={4}
              defaultValue={values.instagramReels}
              placeholder="https://www.instagram.com/reel/XXXX/&#10;https://www.instagram.com/reel/YYYY/"
            />
            <p className="text-xs text-muted-foreground">
              One Instagram reel or post URL per line — these are embedded on the homepage.
              Instagram doesn&apos;t allow pulling a whole profile automatically, so paste the reels
              you want to feature. Leave empty to show just a &ldquo;Watch on Instagram&rdquo; button.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />} Save settings
      </Button>
    </form>
  );
}
