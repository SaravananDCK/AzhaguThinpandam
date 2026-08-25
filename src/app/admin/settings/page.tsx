import type { Metadata } from "next";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";
import { parseGoodieTiers } from "@/lib/box";
import { paiseToRupees } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const [settings, variants] = await Promise.all([
    getSettings(),
    prisma.productVariant.findMany({
      where: { isActive: true, product: { isActive: true } },
      include: { product: { select: { name: true, madeToOrder: true } } },
      orderBy: [{ product: { name: "asc" } }, { sortOrder: "asc" }],
    }),
  ]);
  const variantOptions = variants.map((v) => ({
    id: v.id,
    label: `${v.product.name} — ${v.label}`,
    stock: v.stock,
    madeToOrder: v.product.madeToOrder,
  }));

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
          outsideTnPerKgRupees: paiseToRupees(
            parseInt(settings[SETTINGS.OUTSIDE_TN_PER_KG], 10) || 0
          ),
          lowStockThreshold: settings[SETTINGS.LOW_STOCK_THRESHOLD],
          boxTiers: settings[SETTINGS.BOX_TIERS],
          discountType:
            settings[SETTINGS.DISCOUNT_TYPE] === "goodies" ? ("goodies" as const) : ("percent" as const),
          goodieTiers: parseGoodieTiers(settings[SETTINGS.GOODIE_TIERS]),
          packingCostRupees: paiseToRupees(
            parseInt(settings[SETTINGS.PACKING_COST], 10) || 0
          ),
          roundToFive: settings[SETTINGS.ROUND_TO_FIVE] !== "0",
          instagramHandle: settings[SETTINGS.INSTAGRAM_HANDLE] ?? "",
          instagramReels: settings[SETTINGS.INSTAGRAM_REELS] ?? "",
          gaMeasurementId: settings[SETTINGS.GA_MEASUREMENT_ID] ?? "",
          metaPixelId: settings[SETTINGS.META_PIXEL_ID] ?? "",
          preLaunchNotice: settings[SETTINGS.PRE_LAUNCH_NOTICE] ?? "",
          defaultGstRate: settings[SETTINGS.DEFAULT_GST_RATE] ?? "5",
          manualUpiPayment: settings[SETTINGS.MANUAL_UPI_PAYMENT] === "1",
          upiId: settings[SETTINGS.UPI_ID] ?? "",
          paymentPendingNote: settings[SETTINGS.PAYMENT_PENDING_NOTE] ?? "",
        }}
        variantOptions={variantOptions}
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
