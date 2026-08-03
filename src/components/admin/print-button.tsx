"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Triggers the browser's print dialog. Hidden on paper via .no-print. */
export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button className="no-print" onClick={() => window.print()}>
      <Printer className="size-4" /> {label}
    </Button>
  );
}
