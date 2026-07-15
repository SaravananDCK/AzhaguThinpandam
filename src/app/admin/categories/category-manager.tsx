"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CategoryRow = {
  id: string;
  name: string;
  tamilName: string | null;
  slug: string;
  image: string | null;
  productCount: number;
};

import { saveCategory, deleteCategory } from "./actions";

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [image, setImage] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const open = creating || editing !== null;

  function openCreate() {
    setImage("");
    setCreating(true);
  }
  function openEdit(cat: CategoryRow) {
    setImage(cat.image ?? "");
    setEditing(cat);
  }
  function close() {
    setCreating(false);
    setEditing(null);
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", files[0]);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) toast.error(data.error ?? "Upload failed");
      else setImage(data.url);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleSave(formData: FormData) {
    formData.set("image", image);
    startTransition(async () => {
      const res = await saveCategory(editing?.id ?? null, formData);
      if (res.error) toast.error(res.error);
      else {
        toast.success(editing ? "Category updated" : "Category created");
        close();
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Categories</h1>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> New category
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center gap-3">
              <div className="size-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
                {c.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" className="size-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.tamilName ? `${c.tamilName} · ` : ""}
                  {c.productCount} product{c.productCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Edit">
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await deleteCategory(c.id);
                      if (res.error) toast.error(res.error);
                      else toast.success("Category deleted");
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          <form action={handleSave} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="c-name">Name</Label>
              <Input id="c-name" name="name" required defaultValue={editing?.name} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-tamil">Tamil name (optional)</Label>
              <Input id="c-tamil" name="tamilName" defaultValue={editing?.tamilName ?? ""} />
            </div>
            <div className="grid gap-2">
              <Label>Image (optional)</Label>
              <div className="flex items-center gap-3">
                <div className="size-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                  {image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className="size-full object-cover" />
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                  {image ? "Replace" : "Upload"}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  hidden
                  onChange={(e) => handleUpload(e.target.files)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={pending || uploading}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Save changes" : "Create category"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
