import { PrismaClient } from '@prisma/client';

/**
 * One-off backfill: products that were already APPROVED for the affiliate
 * program before the per-product reward rate existed default to the standard
 * 20% rate. Idempotent and safe to re-run.
 */
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.product.updateMany({
    where: {
      affiliateStatus: 'APPROVED',
      affiliateCommissionRate: null,
    },
    data: { affiliateCommissionRate: 20 },
  });
  console.log(
    `Backfilled affiliate rate 20% on ${result.count} approved product(s)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
