import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "../customer-form";

export const metadata: Metadata = { title: "New customer" };

type Props = { searchParams: Promise<{ phone?: string; next?: string }> };

export default async function AdminNewCustomerPage({ searchParams }: Props) {
  const { phone, next } = await searchParams;

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={next ?? "/admin/customers"}>
          <ArrowLeft className="size-4" /> Back
        </Link>
      </Button>
      <div>
        <h1 className="font-heading text-2xl font-bold">New customer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          For customers who order over WhatsApp. They can later log in with this
          same number and see their order history.
        </p>
      </div>
      <CustomerForm
        next={next}
        values={{
          phone: phone ?? "",
          name: "",
          email: "",
          line1: "",
          line2: "",
          city: "",
          state: "",
          pincode: "",
          isEmployee: false,
        }}
      />
    </div>
  );
}
