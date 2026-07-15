// Creates (or resets) the store admin user in production.
// Usage: docker compose exec -e ADMIN_USER_EMAIL=you@x.com -e ADMIN_USER_PASSWORD=secret app node scripts/create-admin.mjs
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const email = process.env.ADMIN_USER_EMAIL?.toLowerCase().trim();
const password = process.env.ADMIN_USER_PASSWORD;

if (!email || !password || password.length < 8) {
  console.error(
    "Set ADMIN_USER_EMAIL and ADMIN_USER_PASSWORD (min 8 chars) environment variables."
  );
  process.exit(1);
}

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash(password, 10);

await prisma.user.upsert({
  where: { email },
  update: { role: "ADMIN", passwordHash },
  create: { email, name: "Store Admin", role: "ADMIN", passwordHash },
});

console.log(`Admin user ready: ${email}`);
await prisma.$disconnect();
