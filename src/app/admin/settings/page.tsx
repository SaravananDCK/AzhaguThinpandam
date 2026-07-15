import type { Metadata } from "next";
import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";
import { paiseToRupees } from "@/lib/money";
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
        }}
      />
    </div>
  );
}
