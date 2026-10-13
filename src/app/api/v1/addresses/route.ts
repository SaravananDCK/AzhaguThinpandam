import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

const select = {
  id: true,
  name: true,
  phone: true,
  line1: true,
  line2: true,
  city: true,
  state: true,
  pincode: true,
  isDefault: true,
} as const;

/** The customer's address book, default first. */
export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select,
  });
  return NextResponse.json({ addresses });
}

// Same shape and limits as the delivery address at checkout (checkoutSchema)
const addressSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  isDefault: z.boolean().optional(),
});

export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const parsed = addressSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      // Only the hand-written messages are fit to show; zod's own are not
      {
        error:
          parsed.error.issues.find((i) => i.message.startsWith("Enter"))?.message ??
          "Please check the address details.",
      },
      { status: 400 }
    );
  }
  const { isDefault, line2, ...rest } = parsed.data;

  const address = await prisma.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId: user.id } });
    // The first address is the default; later ones only when asked
    const makeDefault = count === 0 || isDefault === true;
    if (makeDefault) {
      await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    }
    return tx.address.create({
      data: { ...rest, line2: line2 || null, userId: user.id, isDefault: makeDefault },
      select,
    });
  });
  return NextResponse.json({ address }, { status: 201 });
}
