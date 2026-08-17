import { z } from "zod";
import { PRODUCT_LINES } from "@/lib/constants";

export const productSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(200),
  tamilName: z.string().trim().max(200).optional().or(z.literal("")),
  slug: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().min(10, "Description is too short").max(5000),
  categoryId: z.string().min(1, "Pick a category"),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  isFlagship: z.boolean().default(false),
  madeToOrder: z.boolean().default(false),
  line: z.enum(PRODUCT_LINES).default("SNACKS"),
  purchasePricePerKg: z.number().int().min(1).nullable().optional(), // paise
  profitMarginPct: z.number().min(0).max(1000).nullable().optional(),
  gstRate: z.number().min(0).max(100).nullable().optional(), // GST% in the sale price

  images: z.array(z.string().min(1)).max(8),
  variants: z
    .array(
      z.object({
        id: z.string().optional(), // present for existing variants on update
        label: z.string().trim().min(1, "Variant label required").max(50),
        price: z.number().int().min(100, "Price must be at least ₹1"), // paise
        mrp: z.number().int().min(100).nullable().optional(),
        // May be negative for made-to-order items, where it means packs owed —
        // saving such a product must not fail validation.
        stock: z.number().int().min(-100000).max(100000),
        // Needed for anything whose label isn't a weight ("Single", "Set of 4"):
        // without it the pack weighs nothing and ships free outside Tamil Nadu.
        weightGrams: z.number().int().min(1).max(100000).nullable().optional(),
        // Per-unit wholesale cost (paise) for items not bought by the kilo
        unitCost: z.number().int().min(1).nullable().optional(),
        sku: z.string().trim().max(100).optional().or(z.literal("")),
      })
    )
    .min(1, "Add at least one variant")
    .max(20),
});

export type ProductInput = z.infer<typeof productSchema>;
