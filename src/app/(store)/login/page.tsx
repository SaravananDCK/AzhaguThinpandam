import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/store/auth-forms";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/account");

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-6 text-center font-heading text-2xl font-bold">Welcome back</h1>
      <LoginForm />
    </div>
  );
}
