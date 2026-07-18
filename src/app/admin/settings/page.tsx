import type { Metadata } from "next";
import { Download } from "lucide-react";
import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";
import { paiseToRupees } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-bold">Settings</h1>
      <SettingsForm
        values={{
          storeName: settings[SETTINGS.STORE_NAME],
          storePhone: settings[SETTINGS.STORE_PHONE],
          storeEmail: settings[SETTINGS.STORE_EMAIL],
          storeAddress: settings[SETTINGS.STORE_ADDRESS],
          shippingFeeRupees: paiseToRupees(
            parseInt(settings[SETTINGS.SHIPPING_FEE], 10) || 0
          ),
          freeShippingAboveRupees: paiseToRupees(
            parseInt(settings[SETTINGS.FREE_SHIPPING_ABOVE], 10) || 0
          ),
          lowStockThreshold: settings[SETTINGS.LOW_STOCK_THRESHOLD],
          boxTiers: settings[SETTINGS.BOX_TIERS],
          packingCostRupees: paiseToRupees(
            parseInt(settings[SETTINGS.PACKING_COST], 10) || 0
          ),
          roundToFive: settings[SETTINGS.ROUND_TO_FIVE] !== "0",
          instagramHandle: settings[SETTINGS.INSTAGRAM_HANDLE] ?? "",
          instagramReels: settings[SETTINGS.INSTAGRAM_REELS] ?? "",
        }}
      />

      <Card className="max-w-xl">
        <CardContent className="space-y-3">
          <p className="font-semibold">Backup</p>
          <p className="text-sm text-muted-foreground">
            Download a consistent snapshot of the entire database — products,
            orders, customers, purchases and expenses. Keep a copy somewhere safe
            (product photos are backed up separately by the server&apos;s nightly
            job).
          </p>
          <Button asChild variant="outline">
            <a href="/api/admin/backup" download>
              <Download className="size-4" /> Download database backup
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
