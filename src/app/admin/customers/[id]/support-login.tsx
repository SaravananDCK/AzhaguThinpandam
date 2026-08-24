"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateCustomerLoginCode } from "../actions";

/**
 * "See what this customer sees": mints a 5-minute login code for their
 * account. Log in with it in a private/incognito window so your admin session
 * here stays untouched.
 */
export function SupportLogin({ customerId }: { customerId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ code: string; identifier: string } | null>(null);

  return (
    <Card className="max-w-xl">
      <CardContent className="space-y-3">
        <p className="font-semibold">Log in as this customer</p>
        <p className="text-sm text-muted-foreground">
          Generates a one-time code (valid 5 minutes, this customer only) so you
          can see their cart, orders and payment screens exactly as they do.
          Nothing is sent to the customer.
        </p>
        {result ? (
          <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
            <p>
              Code:{" "}
              <span className="font-mono text-lg font-bold tracking-widest">{result.code}</span>
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Open the store&apos;s /login page in a private/incognito window</li>
              <li>
                Enter <span className="font-mono font-medium">{result.identifier}</span> and choose{" "}
                <em>&quot;Already have a code?&quot;</em> — don&apos;t send a new one, that
                WhatsApps the customer and replaces this code
              </li>
              <li>Enter the code above</li>
            </ol>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await generateCustomerLoginCode(customerId);
                if (res.code && res.identifier) {
                  setResult({ code: res.code, identifier: res.identifier });
                } else {
                  toast.error(res.error ?? "Could not generate a code.");
                }
              })
            }
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
            Generate login code
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
