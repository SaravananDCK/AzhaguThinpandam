import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, MapPin, Package, User } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-xl border p-3">
          <p className="px-3 py-2 text-sm font-semibold">
            {session.user.name ?? session.user.phone ?? session.user.email}
          </p>
          <nav className="flex flex-col gap-1">
            <Button asChild variant="ghost" className="justify-start">
              <Link href="/account">
                <User className="size-4" /> Profile
              </Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start">
              <Link href="/account/orders">
                <Package className="size-4" /> Orders
              </Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start">
              <Link href="/account/addresses">
                <MapPin className="size-4" /> Addresses
              </Link>
            </Button>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button
                type="submit"
                variant="ghost"
                className="w-full justify-start text-muted-foreground"
              >
                <LogOut className="size-4" /> Sign out
              </Button>
            </form>
          </nav>
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
