import { redirect } from "next/navigation";

// Registration is merged into login: the first phone-OTP login creates the
// account. Old /register links land on /login.
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  redirect(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login");
}
