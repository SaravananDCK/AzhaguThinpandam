"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Address } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addAddress, deleteAddress, setDefaultAddress } from "./actions";

export function AddressManager({ addresses }: { addresses: Address[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const res = await addAddress(formData);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Address added");
        setOpen(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Addresses</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> Add address
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New address</DialogTitle>
            </DialogHeader>
            <form action={handleAdd} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="a-name">Full name</Label>
                  <Input id="a-name" name="name" required />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="a-phone">Mobile</Label>
                  <Input id="a-phone" name="phone" required pattern="[6-9][0-9]{9}" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="a-line1">Address line 1</Label>
                <Input id="a-line1" name="line1" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="a-line2">Address line 2 (optional)</Label>
                <Input id="a-line2" name="line2" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="a-city">City</Label>
                  <Input id="a-city" name="city" required />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="a-state">State</Label>
                  <Input id="a-state" name="state" required />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="a-pincode">Pincode</Label>
                  <Input id="a-pincode" name="pincode" required pattern="[0-9]{6}" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />} Save address
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No saved addresses. Add one to speed up checkout.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{a.name}</p>
                  {a.isDefault && <Badge variant="secondary">Default</Badge>}
                </div>
                <div className="text-muted-foreground">
                  <p>{a.line1}</p>
                  {a.line2 && <p>{a.line2}</p>}
                  <p>
                    {a.city}, {a.state} — {a.pincode}
                  </p>
                  <p>Phone: {a.phone}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  {!a.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await setDefaultAddress(a.id);
                        })
                      }
                    >
                      <Star className="size-3.5" /> Set default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteAddress(a.id);
                        toast.success("Address removed");
                      })
                    }
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
