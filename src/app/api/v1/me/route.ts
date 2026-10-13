import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

const select = { id: true, name: true, phone: true, email: true, isEmployee: true } as const;

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  const me = await prisma.user.findUnique({ where: { id: user.id }, select });
  if (!me) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  return NextResponse.json({ user: me });
}

// Same rules as the website's /api/profile
const patchSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email").max(200).optional().or(z.literal("")),
});

export async function PATCH(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid details." },
      { status: 400 }
    );
  }
  const email = parsed.data.email ? parsed.data.email.toLowerCase() : null;

  try {
    const me = await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name, ...(email ? { email } : {}) },
      select,
    });
    return NextResponse.json({ user: me });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "That email is already linked to another account." },
        { status: 409 }
      );
    }
    throw e;
  }
}
