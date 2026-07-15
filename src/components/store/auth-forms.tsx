"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RESEND_COOLDOWN_MS = 30_000;

function PhoneOtpForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code" | "profile">("phone");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const resendWait = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  async function sendOtp() {
    setBusy(true);
    try {
      const res = await fetch("/api/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not send the code.");
        return;
      }
      setDevCode(data.devCode ?? null);
      setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS);
      setStep("code");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePhoneSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await sendOtp();
  }

  async function handleCodeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const res = await signIn("phone-otp", {
      phone,
      code: form.get("code") as string,
      redirect: false,
    });
    if (res?.error) {
      toast.error("Incorrect or expired code. Please try again.");
      setBusy(false);
      return;
    }
    // First-ever login (or profile never completed): ask for their details once
    try {
      const session = await fetch("/api/auth/session").then((r) => r.json());
      if (!session?.user?.name) {
        setStep("profile");
        setBusy(false);
        return;
      }
    } catch {
      // If the check fails, don't block login
    }
    router.push(callbackUrl);
    router.refresh();
  }

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email") || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save your details.");
        setBusy(false);
        return;
      }
      toast.success("Welcome to AzhaguThinpandam!");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
      setBusy(false);
    }
  }

  function skipProfile() {
    router.push(callbackUrl);
    router.refresh();
  }

  // Distinct keys: the controlled phone input and uncontrolled code input must
  // not be reconciled into the same DOM node when the step switches
  if (step === "phone") {
    return (
      <form key="phone-step" onSubmit={handlePhoneSubmit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="phone">Mobile number</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            placeholder="10-digit mobile number"
            required
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            We&apos;ll WhatsApp you a one-time code. No password needed — your
            account is created automatically on first login.
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
          Send code on WhatsApp
        </Button>
      </form>
    );
  }

  if (step === "profile") {
    return (
      <form key="profile-step" onSubmit={handleProfileSubmit} className="space-y-4">
        <div className="space-y-1 text-center">
          <p className="font-heading text-lg font-semibold">வணக்கம்! 🙏</p>
          <p className="text-sm text-muted-foreground">
            You&apos;re in — tell us a little about yourself.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="p-name">Your name</Label>
          <Input id="p-name" name="name" required minLength={2} autoComplete="name" autoFocus />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="p-email">Email (optional)</Label>
          <Input id="p-email" name="email" type="email" autoComplete="email" />
          <p className="text-xs text-muted-foreground">
            We&apos;ll send order confirmations here.
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />} Save &amp; continue
        </Button>
        <p className="text-center text-sm">
          <button
            type="button"
            className="text-muted-foreground hover:underline"
            onClick={skipProfile}
          >
            Skip for now
          </button>
        </p>
      </form>
    );
  }

  return (
    <form key="code-step" onSubmit={handleCodeSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="code">Enter the 6-digit code</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          autoComplete="one-time-code"
          autoFocus
          className="text-center text-lg tracking-[0.5em]"
        />
        <p className="text-xs text-muted-foreground">
          Sent via WhatsApp to <span className="font-medium">{phone}</span>.{" "}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              setStep("phone");
              setDevCode(null);
            }}
          >
            Change number
          </button>
        </p>
        {devCode && (
          <p className="rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Dev mode (WhatsApp not configured) — your code is{" "}
            <span className="font-mono font-bold">{devCode}</span>
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />} Verify &amp; log in
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Didn&apos;t get it?{" "}
        <button
          type="button"
          className="text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          disabled={busy || resendWait > 0}
          onClick={sendOtp}
        >
          {resendWait > 0 ? `Resend in ${resendWait}s` : "Resend code"}
        </button>
      </p>
    </form>
  );
}

function AdminEmailForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    const res = await signIn("credentials", {
      email: form.get("email") as string,
      password: form.get("password") as string,
      redirect: false,
    });
    if (res?.error) {
      toast.error("Incorrect email or password.");
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="size-4 animate-spin" />} Log in
      </Button>
    </form>
  );
}

function LoginFormInner() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/account";
  const [mode, setMode] = useState<"otp" | "admin">("otp");

  return (
    <Card>
      <CardContent className="space-y-4">
        {mode === "otp" ? (
          <PhoneOtpForm callbackUrl={callbackUrl} />
        ) : (
          <AdminEmailForm callbackUrl={callbackUrl} />
        )}
        <p className="text-center text-xs text-muted-foreground">
          {mode === "otp" ? (
            <button
              type="button"
              className="hover:underline"
              onClick={() => setMode("admin")}
            >
              Store admin? Log in with email
            </button>
          ) : (
            <button
              type="button"
              className="hover:underline"
              onClick={() => setMode("otp")}
            >
              ← Customer login with mobile number
            </button>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  );
}
