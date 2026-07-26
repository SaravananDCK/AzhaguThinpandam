import { z } from "zod";
import { SUPPLIER_PAYMENT_METHODS } from "@/lib/constants";

export const supplierSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(200),
  gstin: z.string().trim().max(20).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  gstRate: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const supplierPaymentSchema = z.object({
  date: z.coerce.date(),
  amount: z.number().int().min(1), // paise
  method: z.enum(SUPPLIER_PAYMENT_METHODS).optional().or(z.literal("")),
  reference: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
export type SupplierPaymentInput = z.infer<typeof supplierPaymentSchema>;
