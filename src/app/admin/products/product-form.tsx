"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { paiseToRupees, rupeesToPaise } from "@/lib/money";
import { applyMarginPricing } from "@/lib/pricing";

type VariantRow = {
  id?: string;
  label: string;
  priceRupees: string;
  mrpRupees: string;
  stock: string;
  sku: string;
};

type ProductData = {
  id: string;
  name: string;
  tamilName: string | null;
  slug: string;
  description: string;
  categoryId: string;
  isActive: boolean;
  isFeatured: boolean;
  isFlagship: boolean;
  purchasePricePerKg: number | null;
  profitMarginPct: number | null;
  images: { url: string }[];
  variants: {
    id: string;
    label: string;
    price: number;
    mrp: number | null;
    stock: number;
    sku: string | null;
  }[];
};

export function ProductForm({
  categories,
  product,
}: {
  categories: Category[];
  product?: ProductData;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [name, setName] = useState(product?.name ?? "");
  const [tamilName, setTamilName] = useState(product?.tamilName ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [isFlagship, setIsFlagship] = useState(product?.isFlagship ?? false);
  const [purchasePerKg, setPurchasePerKg] = useState(
    product?.purchasePricePerKg ? paiseToRupees(product.purchasePricePerKg) : ""
  );
  const [marginPct, setMarginPct] = useState(
    product?.profitMarginPct != null ? String(product.profitMarginPct) : ""
  );
  const [images, setImages] = useState<string[]>(product?.images.map((i) => i.url) ?? []);
  function recalcPrices() {
    const perKg = rupeesToPaise(purchasePerKg);
    const margin = parseFloat(marginPct);
    if (!perKg || perKg <= 0 || !Number.isFinite(margin) || margin < 0) {
      toast.error("Enter a purchase price (₹/kg) and a profit margin % first.");
      return;
    }
    const priced = applyMarginPricing(variants.map((v) => v.label), perKg, margin);
    const updated = priced.filter(Boolean).length;
    if (!updated) {
      toast.error("No weight-based variants (like “250 g” or “1 kg”) to price.");
      return;
    }
    setVariants((rows) =>
      rows.map((row, i) => {
        const p = priced[i];
        if (!p) return row;
        return {
          ...row,
          priceRupees: paiseToRupees(p.price),
          mrpRupees: p.mrp ? paiseToRupees(p.mrp) : "",
        };
      })
    );
    toast.success(`Updated ${updated} variant price${updated === 1 ? "" : "s"} — review and save.`);
  }

  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants.map((v) => ({
      id: v.id,
      label: v.label,
      priceRupees: paiseToRupees(v.price),
      mrpRupees: v.mrp ? paiseToRupees(v.mrp) : "",
      stock: String(v.stock),
      sku: v.sku ?? "",
    })) ?? [{ label: "250 g", priceRupees: "", mrpRupees: "", stock: "0", sku: "" }]
  );

  function setVariant(index: number, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? `Upload failed for ${file.name}`);
          continue;
        }
        setImages((imgs) => [...imgs, data.url]);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsedVariants = [];
    for (const v of variants) {
      const price = rupeesToPaise(v.priceRupees);
      const mrp = v.mrpRupees ? rupeesToPaise(v.mrpRupees) : null;
      const stock = parseInt(v.stock, 10);
      if (!v.label.trim() || price === null || price < 100 || Number.isNaN(stock)) {
        toast.error("Each variant needs a label, a valid price and stock.");
        return;
      }
      parsedVariants.push({
        id: v.id,
        label: v.label.trim(),
        price,
        mrp,
        stock,
        sku: v.sku.trim(),
      });
    }

    setSaving(true);
    try {
      const payload = {
        name,
        tamilName,
        slug,
        description,
        categoryId,
        isActive,
        isFeatured,
        isFlagship,
        purchasePricePerKg: rupeesToPaise(purchasePerKg) || null,
        profitMarginPct: marginPct.trim() ? parseFloat(marginPct) || null : null,
        images,
        variants: parsedVariants,
      };
      const res = await fetch(
        product ? `/api/admin/products/${product.id}` : "/api/admin/products",
        {
          method: product ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save the product.");
        setSaving(false);
        return;
      }
      toast.success(product ? "Product updated" : "Product created");
      router.push("/admin/products");
      router.refresh();
    } catch {
      toast.error("Network error.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!product) return;
    setSaving(true);
    const res = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not delete.");
      setSaving(false);
      return;
    }
    toast.success(data.deactivated ? "Product hidden (it has past orders)" : "Product deleted");
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="p-name">Name</Label>
                <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-tamil">Tamil name (optional)</Label>
                <Input
                  id="p-tamil"
                  value={tamilName}
                  onChange={(e) => setTamilName(e.target.value)}
                  placeholder="எ.கா. முறுக்கு"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-slug">Slug (URL, optional — derived from name)</Label>
              <Input
                id="p-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="murukku"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea
                id="p-desc"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            <p className="font-semibold">Pricing rule</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="p-purchase">Purchase price ₹/kg</Label>
                <Input
                  id="p-purchase"
                  type="number"
                  min="0"
                  step="0.01"
                  value={purchasePerKg}
                  onChange={(e) => setPurchasePerKg(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-margin">Profit margin %</Label>
                <Input
                  id="p-margin"
                  type="number"
                  min="0"
                  step="0.5"
                  value={marginPct}
                  onChange={(e) => setMarginPct(e.target.value)}
                />
              </div>
              <div className="grid content-end">
                <Button type="button" variant="outline" onClick={recalcPrices}>
                  Recalculate variant prices
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Fills the variant prices below from cost + margin (e.g. ₹220/kg + 60% →
              250 g = ₹88); 500 g and 1 kg get the standard 5% / 10% bulk discount with
              the undiscounted price as MRP. Review, adjust if needed, then save.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Variants</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setVariants((rows) => [
                    ...rows,
                    { label: "", priceRupees: "", mrpRupees: "", stock: "0", sku: "" },
                  ])
                }
              >
                <Plus className="size-3.5" /> Add variant
              </Button>
            </div>
            <div className="space-y-3">
              {variants.map((v, i) => (
                <div
                  key={v.id ?? `new-${i}`}
                  className="grid grid-cols-2 items-end gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_100px_100px_80px_1fr_36px]"
                >
                  <div className="grid gap-1">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={v.label}
                      onChange={(e) => setVariant(i, { label: e.target.value })}
                      placeholder="250 g"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Price ₹</Label>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={v.priceRupees}
                      onChange={(e) => setVariant(i, { priceRupees: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">MRP ₹ (opt)</Label>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={v.mrpRupees}
                      onChange={(e) => setVariant(i, { mrpRupees: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Stock</Label>
                    <Input
                      type="number"
                      min="0"
                      value={v.stock}
                      onChange={(e) => setVariant(i, { stock: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">SKU (opt)</Label>
                    <Input
                      value={v.sku}
                      onChange={(e) => setVariant(i, { sku: e.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={variants.length === 1}
                    onClick={() => setVariants((rows) => rows.filter((_, j) => j !== i))}
                    aria-label="Remove variant"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 accent-primary"
              />
              Visible in store
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="size-4 accent-primary"
              />
              Featured on home page
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isFlagship}
                onChange={(e) => setIsFlagship(e.target.checked)}
                className="size-4 accent-primary"
              />
              Flagship — pinned first with a “Signature” badge
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            <p className="font-semibold">Images</p>
            <div className="grid grid-cols-3 gap-2">
              {images.map((url, i) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    <X className="size-3.5" />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                      Main
                    </span>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {uploading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <ImagePlus className="size-5" />
                )}
                <span className="text-[10px]">{uploading ? "Uploading…" : "Add"}</span>
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              hidden
              onChange={(e) => handleUpload(e.target.files)}
            />
            <p className="text-xs text-muted-foreground">
              JPEG/PNG/WebP up to 8 MB. Resized automatically. First image is the main one.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={saving || uploading}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {product ? "Save changes" : "Create product"}
          </Button>
          {product && (
            <Button
              type="button"
              variant="destructive"
              disabled={saving}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this product?</DialogTitle>
            <DialogDescription>
              If the product has past orders it will be hidden instead of deleted, so order
              history stays intact.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
