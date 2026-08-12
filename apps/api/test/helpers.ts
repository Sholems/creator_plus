import { prisma, Prisma } from '@creatormarket/database';
import { randomUUID } from 'crypto';

/**
 * Integration-test helpers. These talk to a REAL Postgres (money flows must not
 * be tested against a mock). Point DATABASE_URL at a throwaway database and run
 * `npm run db:push` before the suite. See test/README.md.
 */

/** Truncate every table between tests so specs are order-independent. */
export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  const list = tables
    .map((t) => `"public"."${t.tablename}"`)
    .filter((name) => !name.includes('_prisma_migrations'))
    .join(', ');
  if (list) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE;`);
  }
}

export async function createUser(overrides: Partial<{ email: string }> = {}) {
  return prisma.user.create({
    data: {
      email: overrides.email ?? `user_${randomUUID()}@test.dev`,
      passwordHash: 'x',
      displayName: 'Test User',
    },
  });
}

/** A buyer whose wallet is pre-funded with `balance` NGN. */
export async function createFundedBuyer(balance: number) {
  const user = await createUser();
  await prisma.wallet.create({
    data: { userId: user.id, availableBalance: new Prisma.Decimal(balance) },
  });
  return user;
}

/** A creator (user + profile) plus one published product at `price`. */
export async function createCreatorWithProduct(price: number) {
  const user = await createUser();
  const profile = await prisma.creatorProfile.create({
    data: {
      userId: user.id,
      storeName: 'Test Store',
      slug: `store-${randomUUID().slice(0, 8)}`,
    },
  });
  const category = await prisma.category.create({
    data: { name: 'Cat', slug: `cat-${randomUUID().slice(0, 8)}` },
  });
  const product = await prisma.product.create({
    data: {
      creatorId: profile.id,
      categoryId: category.id,
      title: 'Test Product',
      slug: `prod-${randomUUID().slice(0, 8)}`,
      description: 'desc',
      price: new Prisma.Decimal(price),
      licenseType: 'PERSONAL',
      status: 'PUBLISHED',
    },
  });
  return { user, profile, product };
}

/** A PENDING order for `buyer` containing `product` × `quantity`. */
export async function createPendingOrder(
  buyerId: string,
  product: { id: string; title: string; price: Prisma.Decimal },
  quantity = 1,
) {
  const unit = product.price;
  const total = unit.mul(quantity);
  return prisma.order.create({
    data: {
      buyerId,
      status: 'PENDING',
      totalAmount: total,
      currency: 'NGN',
      invoiceNumber: `INV-${randomUUID()}`,
      items: {
        create: [
          {
            productId: product.id,
            productName: product.title,
            unitPrice: unit,
            price: unit,
            quantity,
            totalPrice: total,
            licenseType: 'PERSONAL',
          },
        ],
      },
    },
    include: { items: true },
  });
}

/** A download grant (order + item + product file + download row) for `buyer`. */
export async function createGrantedDownload(
  buyerId: string,
  product: { id: string; title: string; price: Prisma.Decimal },
  opts: { maxDownloads?: number; expiresAt?: Date } = {},
) {
  const order = await createPendingOrder(buyerId, product);
  const item = order.items[0];
  await prisma.productFile.create({
    data: {
      productId: product.id,
      fileName: 'file.zip',
      fileKey: `products/${product.id}/${randomUUID()}.zip`,
      fileSize: BigInt(1024),
      mimeType: 'application/zip',
      storageProvider: 'r2',
    },
  });
  return prisma.download.create({
    data: {
      orderItemId: item.id,
      productId: product.id,
      userId: buyerId,
      token: randomUUID(),
      expiresAt: opts.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
      maxDownloads: opts.maxDownloads ?? 10,
    },
  });
}

/** No-op stubs for the non-DB collaborators the services need. */
export const emailStub = {
  sendOrderConfirmation: async () => undefined,
  sendNewSale: async () => undefined,
} as any;

export const notificationsStub = {
  create: async () => undefined,
} as any;

export const providerFactoryStub = {
  get: () => {
    throw new Error('provider not needed in this test');
  },
} as any;

export const storageStub = {
  getSignedDownloadUrl: async (key: string) => `https://signed.example/${key}`,
} as any;

/** Provider factory whose refundPayment succeeds — the refund happy path. */
export const refundProviderFactoryStub = {
  get: () => ({
    name: 'test',
    refundPayment: async () => ({ providerRefundId: 'test_refund_1', success: true }),
  }),
} as any;
