/**
 * Idempotent dev helper: approve a spread of existing published products for the
 * affiliate program with varied creator-set reward rates, so the affiliate
 * marketplace page has demo content without re-running the full seed.
 *
 * Safe to run repeatedly. Skips slugs that don't exist.
 *
 * Usage:
 *   DATABASE_URL=$(cat ../../../apps/api/.env | grep DATABASE_URL | cut -d= -f2-) \
 *     node -r ts-node/register prisma/backfill-affiliate-demo.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const demo = [
  { slug: 'ultimate-chatgpt-prompt-bundle', rate: 25 },
  { slug: 'nextjs-saas-starter-kit', rate: 30 },
  { slug: 'ultimate-ui-kit-figma', rate: 20 },
  { slug: 'python-programming-masterclass', rate: 20 },
  { slug: 'cinematic-lut-pack', rate: 35 },
  { slug: 'essential-legal-document-bundle', rate: 40 },
  { slug: 'instagram-template-bundle', rate: 50 },
];

async function main() {
  const superAdmin = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: 'super_admin' } } } },
    orderBy: { createdAt: 'asc' },
  });
  if (!superAdmin) throw new Error('No super_admin user found; run the seed first.');

  let updated = 0;
  for (const d of demo) {
    const result = await prisma.product.updateMany({
      where: { slug: d.slug, status: 'PUBLISHED' },
      data: {
        affiliateEnabled: true,
        affiliateStatus: 'APPROVED',
        affiliateCommissionRate: d.rate,
        affiliateApprovedAt: new Date(),
        affiliateApprovedBy: superAdmin.id,
      },
    });
    updated += result.count;
  }
  console.log(`Affiliate demo data applied to ${updated} product(s)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
