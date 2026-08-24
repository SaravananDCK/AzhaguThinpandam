import { z } from "zod";

export const purchaseSchema = z.object({
  date: z.coerce.date(),
  supplier: z.string().trim().min(1).max(200),
  supplierId: z.string().min(1).optional().or(z.literal("")),
  gstRate: z.number().min(0).max(100).default(0),
  // Paise. Courier the supplier billed on top of the goods — see the Purchase
  // model for why it stays out of `total`.
  transportCharge: z.number().int().min(0).max(100_000_00).default(0),
  invoiceNo: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        // Snapshot label, derived from the linked variant in the UI. Kept even
        // if the variant is later deleted (variantId is SetNull).
        description: z.string().trim().min(1).max(300),
        qty: z.number().positive().max(100000),
        unitCost: z.number().int().min(1), // paise
        // Optional inventory link: receiving adds `packs` to this variant
        variantId: z.string().min(1).optional().or(z.literal("")),
        packs: z.number().int().min(1).max(100000).optional(),
      })
    )
    .min(1)
    .max(100),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;
