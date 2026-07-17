import type { Metadata } from "next";
import { CouponsGrid } from "@/components/admin/coupons-grid";

export const metadata: Metadata = { title: "Coupons" };

export default function AdminCouponsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Coupons</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Discount codes customers enter at checkout. A coupon applies only when it beats the
          weight-based bundle discount — the customer always gets whichever is larger, never both.
          The <strong>per-customer</strong> limit is enforced by phone number.
        </p>
      </div>
      <CouponsGrid />
    </div>
  );
}
