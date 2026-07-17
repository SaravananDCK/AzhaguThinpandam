import { PrismaClient } from "@prisma/client";
import { existsSync, unlinkSync } from "node:fs";
const out = "prisma/deploy.db";
for (const f of [out, out + "-wal", out + "-shm"]) if (existsSync(f)) unlinkSync(f);
const p = new PrismaClient();
await p.$executeRawUnsafe(`VACUUM INTO '${out}'`);
await p.$disconnect();
console.log("Wrote clean checkpointed copy -> " + out);
