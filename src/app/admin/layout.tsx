import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeftRight,
  FolderTree,
  LayoutDashboard,
  LineChart,
  Package,
  PackageOpen,
  Receipt,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  Ticket,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import "devextreme/dist/css/dx.light.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin — Azhagu Thinpandam" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/pricing", label: "Pricing", icon: Tags },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/purchases", label: "Purchases", icon: PackageOpen },
  { href: "/admin/stock", label: "Stock", icon: ArrowLeftRight },
  { href: "/admin/expenses", label: "Expenses", icon: Receipt },
  { href: "/admin/finance", label: "Finance", icon: LineChart },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-secondary/30 p-4 md:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-2 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="size-9 rounded-full" />
          <span>
            <span className="font-heading font-bold text-primary">Azhagu Thinpandam</span>
            <span className="block text-xs text-muted-foreground">Admin Panel</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Button key={item.href} asChild variant="ghost" className="justify-start">
              <Link href={item.href}>
                <item.icon className="size-4" /> {item.label}
              </Link>
            </Button>
          ))}
        </nav>
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <Store className="size-4" /> View store
          </Link>
        </Button>
      </aside>

      <div className="flex-1">
        {/* Mobile top bar */}
        <div className="flex items-center gap-1 overflow-x-auto border-b p-2 md:hidden">
          {NAV.map((item) => (
            <Button key={item.href} asChild variant="ghost" size="sm">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </div>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
