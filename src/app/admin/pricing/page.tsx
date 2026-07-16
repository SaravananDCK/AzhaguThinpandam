import type { Metadata } from "next";
import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";
import { PricingGrid } from "@/components/admin/pricing-grid";

export const metadata: Metadata = { title: "Pricing" };

export default async function AdminPricingPage() {
  const settings = await getSettings();
  const roundToFive = settings[SETTINGS.ROUND_TO_FIVE] !== "0";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Pricing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the wholesale <strong>Purchase ₹/kg</strong> and <strong>Margin %</strong> for
          every product in one place. Edit the cells, then <strong>Save</strong> — each
          product&apos;s pack prices recalculate from its rule
          {roundToFive ? " (rounded up to ₹5)" : " (exact to ₹1)"}, with 500 g / 1 kg getting
          the standard bulk discount. Filter by category to price a whole group at once.
        </p>
      </div>
      <PricingGrid />
    </div>
  );
}
