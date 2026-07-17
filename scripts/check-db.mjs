import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const safe = async (fn) => { try { return await fn(); } catch { return "n/a"; } };
const out = {
  orders: await safe(() => p.order.count()),
  payments: await safe(() => p.payment.count()),
  purchases: await safe(() => p.purchase.count()),
  expenses: await safe(() => p.expense.count()),
  products: await safe(() => p.product.count()),
  activeProducts: await safe(() => p.product.count({ where: { isActive: true } })),
  variants: await safe(() => p.productVariant.count()),
  admins: await safe(() => p.user.count({ where: { role: "ADMIN" } })),
  customers: await safe(() => p.user.count()),
  movements: await safe(() => p.stockMovement.count()),
};
console.log(JSON.stringify(out, null, 2));
await p.$disconnect();
