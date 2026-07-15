import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth, updateSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email").max(200).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid details." },
      { status: 400 }
    );
  }

  const name = parsed.data.name;
  const email = parsed.data.email ? parsed.data.email.toLowerCase() : null;

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name, ...(email ? { email } : {}) },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "That email is already linked to another account." },
        { status: 409 }
      );
    }
    throw e;
  }

  // Refresh the JWT session cookie so the new name shows immediately
  await updateSession({ user: { name, ...(email ? { email } : {}) } });

  return NextResponse.json({ ok: true });
}
