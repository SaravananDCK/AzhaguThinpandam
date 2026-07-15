import { z } from "zod";

export const purchaseSchema = z.object({
  date: z.coerce.date(),
  supplier: z.string().trim().min(1).max(200),
  invoiceNo: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  items: z
    .array(
      z
        .object({
          description: z.string().trim().min(1).max(300),
          qty: z.number().positive().max(100000),
          unitCost: z.number().int().min(1), // paise
          // Optional inventory link: receiving adds `packs` to this variant
          variantId: z.string().min(1).optional().or(z.literal("")),
          packs: z.number().int().min(1).max(100000).optional(),
        })
        .refine((i) => !i.variantId || i.packs, {
          message: "Enter how many packs were received for the linked product.",
        })
    )
    .min(1)
    .max(100),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;
