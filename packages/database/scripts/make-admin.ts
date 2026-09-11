/**
 * Grant a user the super_admin (and admin) role. Idempotent — safe to re-run.
 *
 * Usage (from packages/database, with the target DB in DATABASE_URL):
 *   DATABASE_URL="postgres://…" npx ts-node scripts/make-admin.ts you@example.com
 * or set ADMIN_EMAIL instead of passing an argument.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALL_ROLES = ['super_admin', 'admin', 'moderator', 'finance', 'support', 'creator', 'buyer'];
const GRANT = ['super_admin', 'admin'];

async function main() {
  const email = (process.argv[2] || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!email) {
    console.error('Provide an email: npx ts-node scripts/make-admin.ts you@example.com');
    process.exit(1);
  }

  // Ensure the role rows exist (a fresh DB may not have been seeded).
  for (const name of ALL_ROLES) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name, description: `${name} role` } });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email "${email}". Register/sign up first, then re-run.`);
    process.exit(1);
  }

  for (const name of GRANT) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  }

  console.log(`✔ Granted ${GRANT.join(' + ')} to ${email}. Sign out and back in to refresh your token.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
