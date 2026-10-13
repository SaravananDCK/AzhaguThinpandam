import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

type Ctx = { params: Promise<{ id: string }> };

/** Makes this the default delivery address. */
export async function PATCH(_req: Request, { params }: Ctx) {
  const { user, response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  const address = await prisma.address.findFirst({ where: { id, userId: user.id } });
  if (!address) return NextResponse.json({ error: "Address not found." }, { status: 404 });

  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    prisma.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { user, response } = await requireUser();
  if (response) return response;
  const { id } = await params;
  // Scoped to the owner, so someone else's id simply deletes nothing
  await prisma.address.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
