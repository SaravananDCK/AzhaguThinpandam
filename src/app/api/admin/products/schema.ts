import { z } from "zod";

export const productSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(200),
  tamilName: z.string().trim().max(200).optional().or(z.literal("")),
  slug: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().min(10, "Description is too short").max(5000),
  categoryId: z.string().min(1, "Pick a category"),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  isFlagship: z.boolean().default(false),
  purchasePricePerKg: z.number().int().min(1).nullable().optional(), // paise
  profitMarginPct: z.number().min(0).max(1000).nullable().optional(),
  images: z.array(z.string().min(1)).max(8),
  variants: z
    .array(
      z.object({
        id: z.string().optional(), // present for existing variants on update
        label: z.string().trim().min(1, "Variant label required").max(50),
        price: z.number().int().min(100, "Price must be at least ₹1"), // paise
        mrp: z.number().int().min(100).nullable().optional(),
        stock: z.number().int().min(0).max(100000),
        sku: z.string().trim().max(100).optional().or(z.literal("")),
      })
    )
    .min(1, "Add at least one variant")
    .max(20),
});

export type ProductInput = z.infer<typeof productSchema>;
