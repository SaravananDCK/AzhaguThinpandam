"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DiscountType } from "@/lib/constants";
import type { GoodieTier } from "@/lib/box";
import { GoodieTiersEditor, type GoodieVariantOption } from "./goodie-tiers-editor";
import { saveSettings } from "./actions";

type Props = {
  values: {
    storeName: string;
    storePhone: string;
    storeEmail: string;
    storeAddress: string;
    shippingFeeRupees: string;
    freeShippingAboveRupees: string;
    outsideTnPerKgRupees: string;
    lowStockThreshold: string;
    boxTiers: string;
    discountType: DiscountType;
    goodieTiers: GoodieTier[];
    packingCostRupees: string;
    roundToFive: boolean;
    instagramHandle: string;
    instagramReels: string;
    gaMeasurementId: string;
    metaPixelId: string;
    preLaunchNotice: string;
    defaultGstRate: string;
    manualUpiPayment: boolean;
    upiId: string;
    paymentPendingNote: string;
  };
  variantOptions: GoodieVariantOption[];
};

export function SettingsForm({ values, variantOptions }: Props) {
  const [pending, startTransition] = useTransition();
  const [discountType, setDiscountType] = useState<DiscountType>(values.discountType);

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
          <div className="grid gap-2">
            <Label htmlFor="s-ga">Google Analytics ID</Label>
            <Input
              id="s-ga"
              name="gaMeasurementId"
              defaultValue={values.gaMeasurementId}
              placeholder="G-XXXXXXXXXX"
            />
            <p className="text-xs text-muted-foreground">
              GA4 measurement ID. The tag loads on customer-facing pages only
              (never the admin panel). Leave empty to disable tracking.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s-pixel">Meta Pixel ID</Label>
            <Input
              id="s-pixel"
              name="metaPixelId"
              defaultValue={values.metaPixelId}
              placeholder="1093899719866773"
            />
            <p className="text-xs text-muted-foreground">
              Numeric pixel ID from Meta Events Manager. Same rules as the GA
              tag — customer-facing pages only, and live site only. Fires a{" "}
              <strong>Purchase</strong> event once an order is actually paid.
              Leave empty to disable it.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <p className="font-semibold">Shipping & stock</p>
          <p className="text-xs text-muted-foreground">
            Inside Tamil Nadu: a flat fee, free above the threshold. Outside Tamil Nadu:
            charged by weight (rounded up to the next kg), always — no free shipping.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="s-fee">Shipping fee ₹ (inside TN)</Label>
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
              <Label htmlFor="s-free">Free shipping above ₹ (inside TN)</Label>
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
              <Label htmlFor="s-outtn">Outside TN ₹ per kg</Label>
              <Input
                id="s-outtn"
                name="outsideTnPerKg"
                type="number"
                min="0"
                step="0.01"
                defaultValue={values.outsideTnPerKgRupees}
              />
              <p className="text-xs text-muted-foreground">Charged per kg, always.</p>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
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
            <div className="grid gap-2">
              <Label htmlFor="s-gst">Default GST rate %</Label>
              <Input
                id="s-gst"
                name="defaultGstRate"
                type="number"
                min="0"
                max="100"
                step="0.5"
                defaultValue={values.defaultGstRate}
              />
              <p className="text-xs text-muted-foreground">
                Applied to products with no GST rate of their own. Prices are
                GST-inclusive; feeds the output-GST report in Finance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <p className="font-semibold">Build-your-box discounts</p>
          <div className="grid gap-2">
            <Label>Discount type</Label>
            <div className="flex flex-col gap-1.5 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="discountType"
                  value="percent"
                  checked={discountType === "percent"}
                  onChange={() => setDiscountType("percent")}
                  className="size-4 accent-primary"
                />
                Weight discount tiers (% off snacks)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="discountType"
                  value="goodies"
                  checked={discountType === "goodies"}
                  onChange={() => setDiscountType("goodies")}
                  className="size-4 accent-primary"
                />
                Goodies based on weight (free items — more profitable)
              </label>
            </div>
          </div>
          {/* Both editors stay mounted whichever type is active: saveSettings
              upserts every submitted key, so unmounting one would wipe its
              config on save. The inactive one is just dimmed. */}
          <div className={discountType === "percent" ? "grid gap-2" : "grid gap-2 opacity-50"}>
            <Label htmlFor="s-tiers">Weight discount tiers</Label>
            <Input id="s-tiers" name="boxTiers" defaultValue={values.boxTiers} />
            <p className="text-xs text-muted-foreground">
              Format: <code>kg:percent</code> pairs separated by commas — e.g.{" "}
              <code>1:10,2:15,3:20</code> means 1&nbsp;kg+ → 10% off, 2&nbsp;kg+ → 15%,
              3&nbsp;kg+ → 20%. Fractional kg allowed (e.g. <code>0.5:5</code>). Based on
              the cart&apos;s total weight, applied to the whole order. Leave empty to disable.
              {discountType !== "percent" && " Not in use while goodies are selected."}
            </p>
          </div>
          <div className={discountType === "goodies" ? "grid gap-2" : "grid gap-2 opacity-50"}>
            <Label>Goodie tiers</Label>
            <GoodieTiersEditor initial={values.goodieTiers} variants={variantOptions} />
            <p className="text-xs text-muted-foreground">
              Once the cart&apos;s snack weight reaches a tier, that tier&apos;s items are
              added to the order free. Several rows may share the same kg — that tier then
              gives all of them. Only the <strong>highest reached tier</strong> applies;
              tiers don&apos;t stack. Coupons replace goodies (one offer per order), and
              out-of-stock goodies are skipped.
              {discountType !== "goodies" && " Not in use while percent tiers are selected."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <p className="font-semibold">Payment mode</p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="manualUpiPayment"
              defaultChecked={values.manualUpiPayment}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              Collect payment by UPI over WhatsApp (payment gateway not live yet)
            </span>
          </label>
          <p className="text-xs text-muted-foreground">
            While this is on, customers still place real orders — they just get UPI
            instructions instead of a card payment screen. The order sits at{" "}
            <strong>Payment pending</strong> until you confirm the transfer from{" "}
            <strong>Admin → Orders</strong>, which is when stock is deducted and the
            confirmation email goes out. <strong>Turn this off</strong> once your
            payment gateway is live.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="s-upi">UPI ID</Label>
            <Input
              id="s-upi"
              name="upiId"
              defaultValue={values.upiId}
              placeholder="yourname@okicici"
            />
            <p className="text-xs text-muted-foreground">
              Shown on the order page with a &ldquo;Pay by UPI&rdquo; button that opens
              GPay / PhonePe / Paytm with the amount filled in. Leave empty and
              customers are told you&apos;ll send payment details on WhatsApp
              instead. The WhatsApp link uses your <strong>contact phone</strong> above.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s-prelaunch">Checkout banner</Label>
            <Textarea
              id="s-prelaunch"
              name="preLaunchNotice"
              rows={2}
              defaultValue={values.preLaunchNotice}
              placeholder="We're taking orders ahead of our grand inauguration!"
            />
            <p className="text-xs text-muted-foreground">
              Shown at the top of checkout while UPI mode is on. Leave empty for no banner.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s-pendingnote">Payment note on the order page</Label>
            <Textarea
              id="s-pendingnote"
              name="paymentPendingNote"
              rows={3}
              defaultValue={values.paymentPendingNote}
              placeholder="Card payments aren't live yet — your order is placed and reserved…"
            />
            <p className="text-xs text-muted-foreground">
              Shown above the UPI instructions after an order is placed —
              reassures customers who expected a card option that their order
              went through. Leave empty for no note.
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
              One Instagram reel or post URL per line — the <strong>latest 3</strong> are embedded on
              the homepage (paste newest first). Instagram doesn&apos;t allow pulling a whole profile
              automatically, so list the reels you want to feature. Leave empty to show just a
              &ldquo;Watch on Instagram&rdquo; button.
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
