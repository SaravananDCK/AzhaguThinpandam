"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Compact login for mid-flow gates (add-to-cart): phone or email OTP, no
 * navigation — the caller's `onSuccess` continues whatever the customer was
 * doing. The /login page keeps its own richer form.
 */
export function LoginDialog({
  open,
  onOpenChange,
  onSuccess,
  title = "Verify your number",
  description = "A one-time code keeps your cart and orders tied to you.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}) {
  const [step, setStep] = useState<"identifier" | "code">("identifier");
  const [channel, setChannel] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function sendCode() {
    setBusy(true);
    try {
      const res = await fetch("/api/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(channel === "phone" ? { phone } : { email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not send the code.");
        return;
      }
      setDevCode(data.devCode ?? null);
      setCode("");
      setStep("code");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await signIn(channel === "phone" ? "phone-otp" : "email-otp", {
      ...(channel === "phone" ? { phone } : { email }),
      code,
      redirect: false,
    });
    setBusy(false);
    if (res?.error) {
      toast.error("Incorrect or expired code. Please try again.");
      return;
    }
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {step === "identifier" ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void sendCode();
            }}
          >
            {channel === "phone" ? (
              <div className="grid gap-2">
                <Label htmlFor="ld-phone">Mobile number</Label>
                <Input
                  id="ld-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="ld-email">Email</Label>
                <Input
                  id="ld-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {channel === "phone" ? "Send code on WhatsApp" : "Email me a code"}
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setChannel(channel === "phone" ? "email" : "phone")}
            >
              {channel === "phone" ? "Outside India? Use email instead" : "Use mobile number instead"}
            </button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={verify}>
            {devCode && (
              <p className="rounded-lg bg-muted p-2 text-center text-sm">
                Dev code: <span className="font-mono font-bold">{devCode}</span>
              </p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="ld-code">
                Enter the 6-digit code sent to{" "}
                <span className="font-medium">{channel === "phone" ? phone : email}</span>
              </Label>
              <Input
                id="ld-code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Verify & continue
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setStep("identifier")}
            >
              Change {channel === "phone" ? "number" : "email"} or resend
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
