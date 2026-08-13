"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin";
import { ROLES } from "@/lib/constants";
import { normalizePhone } from "@/lib/otp";

const customerSchema = z.object({
  phone: z.string().trim().min(1, "Enter a mobile number"),
  name: z.string().trim().min(2, "Enter the customer's name").max(100),
  email: z.string().trim().email("Enter a valid email").max(200).optional().or(z.literal("")),
  // Optional address — saved as their default so orders prefill from it
  line1: z.string().trim().max(200).optional().or(z.literal("")),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(100).optional().or(z.literal("")),
  pincode: z.string().trim().optional().or(z.literal("")),
  isEmployee: z.boolean(),
});

function parse(formData: FormData) {
  return customerSchema.safeParse({
    phone: formData.get("phone") ?? "",
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    // An unchecked box is simply absent from FormData
    isEmployee: formData.get("isEmployee") === "on",
    line1: formData.get("line1") ?? "",
    line2: formData.get("line2") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    pincode: formData.get("pincode") ?? "",
  });
}

/** An address is only saved when it's complete enough to ship to. */
function addressFrom(d: z.infer<typeof customerSchema>, name: string) {
  if (!d.line1 || !d.city || !d.state || !d.pincode) return null;
  if (!/^\d{6}$/.test(d.pincode)) return "bad-pincode" as const;
  return {
    name,
    line1: d.line1,
    line2: d.line2 || null,
    city: d.city,
    state: d.state,
    pincode: d.pincode,
  };
}

export async function createCustomer(formData: FormData) {
  await assertAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  const d = parsed.data;

  const phone = normalizePhone(d.phone);
  if (!phone) return { error: "Enter a valid 10-digit mobile number." };

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return { error: `${phone} already belongs to a customer — open their profile to edit it.` };
  }

  const address = addressFrom(d, d.name);
  if (address === "bad-pincode") return { error: "Enter a valid 6-digit pincode." };

  try {
    const user = await prisma.user.create({
      data: {
        phone,
        name: d.name,
        ...(d.email ? { email: d.email.toLowerCase() } : {}),
        role: ROLES.CUSTOMER,
        isEmployee: d.isEmployee,
        ...(address ? { addresses: { create: { ...address, phone, isDefault: true } } } : {}),
      },
    });
    revalidatePath("/admin/customers");
    return { ok: true, id: user.id, phone };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "That email is already linked to another customer." };
    }
    console.error("Customer creation failed:", e);
    return { error: "Could not create the customer. Please try again." };
  }
}

export async function updateCustomer(id: string, formData: FormData) {
  await assertAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  const d = parsed.data;

  const phone = normalizePhone(d.phone);
  if (!phone) return { error: "Enter a valid 10-digit mobile number." };

  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) return { error: "Customer not found." };

  // The phone is the login identity — moving it onto another account's number
  // would merge two people, so refuse rather than guess.
  if (phone !== current.phone) {
    const clash = await prisma.user.findUnique({ where: { phone } });
    if (clash) return { error: `${phone} already belongs to another customer.` };
  }

  const address = addressFrom(d, d.name);
  if (address === "bad-pincode") return { error: "Enter a valid 6-digit pincode." };

  try {
    await prisma.user.update({
      where: { id },
      data: {
        phone,
        name: d.name,
        email: d.email ? d.email.toLowerCase() : null,
        isEmployee: d.isEmployee,
      },
    });

    if (address) {
      // Update their default address in place, or create one if they have none
      const existing = await prisma.address.findFirst({
        where: { userId: id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      });
      if (existing) {
        await prisma.address.update({
          where: { id: existing.id },
          data: { ...address, phone },
        });
      } else {
        await prisma.address.create({
          data: { ...address, userId: id, phone, isDefault: true },
        });
      }
    }

    revalidatePath("/admin/customers");
    revalidatePath(`/admin/customers/${id}`);
    return { ok: true, id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "That email is already linked to another customer." };
    }
    console.error("Customer update failed:", e);
    return { error: "Could not save the customer. Please try again." };
  }
}
