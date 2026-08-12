# CreatorMarket / Oja — Remediation Implementation Plan

**Status:** Draft for engineering review
**Scope:** Correctness, security, performance and quality fixes identified in the codebase audit
**Audience:** Backend + frontend engineers working in `apps/api` and `apps/web`

---

## How to use this document

Each item is self-contained and has:

- **ID / Severity** — cross-references the audit (C = Critical, H = High, P = Performance, Q = Quality).
- **Files** — exact paths to touch.
- **Root cause** — why it's wrong today.
- **Implementation** — concrete, copy-adaptable code.
- **Tests** — what must pass before it's considered done.
- **Acceptance criteria** — the definition of done.

Work the milestones in order. Do **not** ship C1–C5 without the tests in M0, because every one of those bugs is a money bug and a regression is expensive.

### Milestones

| Milestone | Contents | Goal |
|---|---|---|
| **M0** | H1 (test harness) | A safety net exists before touching money code |
| **M1** | C1, C2, C3 | Fulfillment is atomic and idempotent |
| **M2** | C4, C5 | Refund reversal + download hardening |
| **M3** | H2, H3, H5 | Rate limiting, refresh-token flow, secret hygiene |
| **M4** | H4, P1–P4 | Decimal money math + performance |
| **M5** | Q1–Q5 | Type-safety and cleanup |

> **Progress:** ✅ **M0–M4 done; M5 substantially done** (2026-08-05). Jest harness in place; **34 tests pass** against real Postgres; both apps typecheck clean.
> - **M1–M2 (C1–C5):** atomic/idempotent fulfillment, no wallet double-spend, refund reversal, download auth+metering — done and tested.
> - **M3 (H2/H3/H5):** rate limiting (429 verified), helmet, httpOnly refresh-cookie rotation, fail-fast secrets — verified at runtime.
> - **M4 (H4/P1–P4):** Decimal order pricing (tested), N+1 price-drop fix, view-count off read path, composite indexes, search `reindexAll` + admin trigger — done.
> - **M5:** Q1 (typed `Prisma.*WhereInput` in orders/products), Q2 (shared `paginate`/`pageMeta` with a **hard `perPage` cap of 100** across orders/products/downloads/refunds/notifications — tested), Q5 (dead `uuidv4` import removed) — **done**.
>   - **Q3 (schema dedupe) and Q4 (dep hygiene) deliberately deferred as separate changes** — see the note under M5 below. Q3 is a DB migration that also touches the web UI; Q4 risks re-triggering a flaky install in this environment.

Conventions used below:

- `tx` is the transactional Prisma client passed to `prisma.$transaction(async (tx) => { ... })`.
- Money helpers use `Prisma.Decimal` (imported from `@creatormarket/database`).

---

# M0 — Test harness (H1)

**Severity:** High. **Files:** `apps/api/jest.config.js` (new), `apps/api/test/**` (new).

### Root cause
Jest, ts-jest, and `@nestjs/testing` are already declared in [`apps/api/package.json`](apps/api/package.json), but there are **zero** test files. Every money bug below is exactly what a test would catch.

### Implementation

1. Add `apps/api/jest.config.js`:

```js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.module.ts', '!src/main.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@creatormarket/database$': '<rootDir>/../../packages/database/src',
  },
};
```

2. Decide the test strategy. Two tiers:

- **Unit tests** for pure logic (pricing, commission math, discount math) — fast, no DB.
- **Integration tests** for fulfillment/refund/wallet — run against a **real Postgres** (Testcontainers or the docker-compose Postgres with a throwaway schema). Mocking Prisma for money flows gives false confidence; use a real DB.

3. Add a test database bootstrap `apps/api/test/db.ts`:

```ts
import { execSync } from 'child_process';
import { prisma } from '@creatormarket/database';

export async function resetDb() {
  // Truncate every table between tests. Order-independent via CASCADE.
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  if (list) await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE;`);
}

export async function migrateTestDb() {
  execSync('npm run db:push', { stdio: 'inherit' });
}
```

4. First test files to author (they double as the specs for M1/M2):
   - `payments.fulfillment.spec.ts` — happy path, duplicate webhook, concurrent webhook.
   - `payments.wallet.spec.ts` — balance debit, insufficient funds, concurrent double-spend.
   - `refunds.spec.ts` — approval reverses wallet + commission.
   - `downloads.spec.ts` — limit enforcement + ownership.

### Acceptance criteria
- `npm run test --workspace @creatormarket/api` runs and reports coverage.
- CI (`.github/workflows/ci.yml`) runs the suite on every PR (spin up the Postgres service container).

---

# M1 — Atomic, idempotent fulfillment

## C1 — Wrap fulfillment in a transaction

**Severity:** Critical. **Files:** [`apps/api/src/payments/payments.service.ts`](apps/api/src/payments/payments.service.ts).

### Root cause
[`fulfillOrder`](apps/api/src/payments/payments.service.ts:159) and [`payWithWallet`](apps/api/src/payments/payments.service.ts:295) issue 6–10 independent writes (order status, downloads, wallet increment, wallet transaction, commissions) with **no transaction**. A crash or error mid-sequence leaves partial state: wallet credited but no commission, downloads issued for an unpaid order, etc.

### Design principles
1. **All DB writes for one fulfillment happen inside one `$transaction`.**
2. **Side effects (email, notifications, search) happen *after* commit**, never inside the transaction — they are best-effort and must not roll back money.
3. The transaction body must be **fast** (no `fetch`/network to payment providers inside it).

### Implementation

Refactor `fulfillOrder` so the DB mutation is one atomic unit, and the emails/notifications fire after:

```ts
private async fulfillOrder(orderId: string) {
  // 1) Atomic claim + all DB writes in a single transaction.
  const result = await prisma.$transaction(async (tx) => {
    // C2: atomic compare-and-set. Only the winner proceeds.
    const claim = await tx.order.updateMany({
      where: { id: orderId, status: { notIn: ['PAID', 'FULFILLED', 'COMPLETED', 'REFUNDED'] } },
      data: { status: 'PAID' },
    });
    if (claim.count === 0) return null; // already fulfilled by a concurrent call

    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        buyer: { select: { id: true, email: true, displayName: true } },
      },
    });

    // Downloads
    await tx.download.createMany({
      data: order.items.map((item) => ({
        orderItemId: item.id,
        productId: item.productId,
        userId: order.buyerId,
        token: uuidv4(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })),
    });

    // Wallet credit + commissions, grouped by creator
    const commissionRate = new Prisma.Decimal(process.env.COMMISSION_RATE || 10);
    const byCreator = groupBy(order.items, (i) => i.product.creatorId); // creatorProfile.id

    // Resolve creatorProfile.id -> user.id in ONE query (fixes N+1, see P1)
    const creatorProfiles = await tx.creatorProfile.findMany({
      where: { id: { in: Object.keys(byCreator) } },
      select: { id: true, userId: true },
    });
    const userIdByProfile = new Map(creatorProfiles.map((c) => [c.id, c.userId]));

    for (const [profileId, items] of Object.entries(byCreator)) {
      const creatorUserId = userIdByProfile.get(profileId);
      if (!creatorUserId) continue;

      // Money math in Decimal (see H4)
      const gross = items.reduce(
        (sum, i) => sum.add(i.unitPrice.mul(i.quantity)),
        new Prisma.Decimal(0),
      );
      const fee = gross.mul(commissionRate).div(100).toDecimalPlaces(2);
      const net = gross.sub(fee).toDecimalPlaces(2);

      const wallet = await tx.wallet.upsert({
        where: { userId: creatorUserId },
        update: {},
        create: { userId: creatorUserId },
      });
      const balanceBefore = wallet.availableBalance;

      await tx.wallet.update({
        where: { userId: creatorUserId },
        data: {
          availableBalance: { increment: net },
          lifetimeEarnings: { increment: net },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'SALE',
          amount: net,
          balanceBefore,
          balanceAfter: balanceBefore.add(net),
          description: 'Product sale',
          referenceType: 'ORDER',
          referenceId: order.id,
        },
      });

      await tx.commission.createMany({
        data: items.map((i) => ({
          orderId: order.id,
          orderItemId: i.id,
          // NOTE: standardize on creatorProfile.id here (see C4 note) —
          // today the code writes user.id; pick one and migrate.
          creatorId: profileId,
          amount: i.unitPrice.mul(i.quantity).mul(commissionRate).div(100).toDecimalPlaces(2),
          rate: commissionRate,
          status: 'PENDING',
        })),
      });
    }

    return order;
  });

  if (!result) return; // idempotent no-op

  // 2) Side effects AFTER commit — never block or roll back money.
  void this.dispatchFulfillmentNotifications(result);
}
```

Move all the `emailService.*` / `notificationsService.*` calls into a new private
`dispatchFulfillmentNotifications(order)` method that runs post-commit.

> **`groupBy`** — use `lodash` (already a dependency) or a 3-line helper.

### Tests
- Happy path: one order, two creators → correct wallet + commission per creator, downloads created, order `PAID`.
- Inject a failure (e.g. throw after wallet update) → assert **nothing** persisted (order still `PENDING`).

### Acceptance criteria
- A forced mid-transaction error leaves zero partial writes.
- Notifications/emails still send on success.

---

## C2 — Idempotent fulfillment under concurrent webhooks

**Severity:** Critical. **Files:** [`payments.service.ts`](apps/api/src/payments/payments.service.ts) (`markOrderPaid`, `fulfillOrder`).

### Root cause
`markOrderPaid` and `fulfillOrder` guard with *read-then-write* (`if status === 'PAID' return`). Providers retry and parallelize webhook delivery; two concurrent deliveries both pass the read and **double-credit** the creator.

### Implementation
The `updateMany({ where: { status: { notIn: [...] } } })` **compare-and-set** in C1 is the fix — it is atomic at the DB level, so exactly one caller gets `count === 1`. Apply the same guard to the payment row in `markOrderPaid`:

```ts
private async markOrderPaid(event: WebhookEvent) {
  const payment = await this.findPaymentForEvent(event);
  if (!payment) throw new BadRequestException('Payment record not found for webhook event');

  // Atomic claim on the payment; only the first webhook wins.
  const claimed = await prisma.payment.updateMany({
    where: { id: payment.id, status: { not: 'SUCCEEDED' } },
    data: { status: 'SUCCEEDED' },
  });
  if (claimed.count === 0) return; // duplicate webhook

  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerResponse: { ...(payment.providerResponse as any), webhook: event.raw } },
  });

  await this.fulfillOrder(payment.orderId);
}
```

Because both the payment claim and the order claim are atomic CAS operations, duplicate/concurrent webhooks are safe end-to-end.

### Recommended hardening (optional but cheap)
Add a webhook-event dedupe table keyed on the provider event id, so replays are rejected at the door:

```prisma
model WebhookEvent {
  id         String   @id @default(uuid()) @db.Uuid
  provider   String
  eventId    String
  processedAt DateTime @default(now())
  @@unique([provider, eventId])
  @@map("webhook_events")
}
```
Insert-or-conflict at the start of `handleWebhook`; if the row already exists, return `{ received: true, duplicate: true }`.

### Tests
- Fire the same `checkout.completed` event twice sequentially → wallet credited **once**.
- Fire two events in parallel (`Promise.all`) → wallet credited **once**, one commission set.

### Acceptance criteria
- No code path can credit a wallet twice for one order.

---

## C3 — Wallet payment double-spend

**Severity:** Critical. **Files:** [`payments.service.ts`](apps/api/src/payments/payments.service.ts) (`payWithWallet`).

### Root cause
[`payWithWallet`](apps/api/src/payments/payments.service.ts:319) reads `availableBalance`, checks `available < total`, then decrements — non-atomically. Two concurrent orders both read the same balance and both succeed → buyer spends more than they hold.

### Implementation
Do the balance check **as part of the conditional update** inside a transaction, then reuse `fulfillOrder`:

```ts
async payWithWallet(orderId: string, buyerId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundException('Order not found');
  if (order.buyerId !== buyerId) throw new ForbiddenException('Not authorized to pay for this order');
  if (order.status === 'PAID') return { provider: 'wallet', alreadyPaid: true, orderId: order.id };
  if (!['PENDING', 'PROCESSING'].includes(order.status)) {
    throw new BadRequestException(`Order cannot be paid in its current state (${order.status})`);
  }

  const total = order.totalAmount;

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId: buyerId },
      update: {},
      create: { userId: buyerId },
    });

    // Atomic guarded decrement: only succeeds if balance is still sufficient.
    const debit = await tx.wallet.updateMany({
      where: { id: wallet.id, availableBalance: { gte: total } },
      data: { availableBalance: { decrement: total } },
    });
    if (debit.count === 0) {
      throw new BadRequestException(
        `Insufficient wallet balance for this ₦${total.toNumber().toLocaleString()} order.`,
      );
    }

    const before = wallet.availableBalance;
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'ADJUSTMENT',
        amount: total.neg(),
        balanceBefore: before,
        balanceAfter: before.sub(total),
        description: 'Wallet purchase',
        referenceType: 'ORDER',
        referenceId: order.id,
      },
    });

    await tx.payment.create({
      data: {
        orderId: order.id,
        amount: total,
        currency: order.currency || 'NGN',
        status: 'SUCCEEDED',
        provider: 'wallet',
      },
    });
  });

  await this.fulfillOrder(order.id); // atomic + idempotent from C1/C2

  const updated = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      items: { include: { product: { select: { id: true, title: true, slug: true, thumbnail: true } } } },
      payment: true,
    },
  });
  return { provider: 'wallet', status: 'PAID', orderId: order.id, order: updated };
}
```

> Note the `balanceBefore` recorded in the ledger is the pre-debit snapshot value read at upsert time; if you need strict serialization of the ledger snapshot, re-read the wallet inside the guarded update using a `RETURNING`-style pattern or run the whole method at `Serializable` isolation.

### Tests
- Buyer with ₦1,000 pays a ₦1,000 order → balance 0, order PAID.
- Buyer with ₦1,000 fires two ₦1,000 orders in parallel → exactly one succeeds, the other 400s.

### Acceptance criteria
- Wallet balance can never go negative.

---

# M2 — Refund reversal + download hardening

## C4 — Refund approval must reverse creator earnings

**Severity:** Critical. **Files:** [`apps/api/src/refunds/refunds.service.ts`](apps/api/src/refunds/refunds.service.ts) (`approve`).

### Root cause
[`approve`](apps/api/src/refunds/refunds.service.ts:128) refunds the buyer and sets order/payment `REFUNDED`, but never debits the creator wallet or reverses the `Commission`. The creator keeps money for a refunded sale — a direct platform loss. `TransactionType.REFUND`/`CHARGEBACK` and `CommissionStatus.REVERSED` already exist in the schema but are unused.

### Prerequisite — resolve the `creatorId` ambiguity
`Commission.creatorId` is currently written as **`user.id`** in `fulfillOrder`, while everything else treats `creatorId` as **`creatorProfile.id`**. Pick one (recommend `creatorProfile.id`) and:
- Update `fulfillOrder` (done in C1 above).
- Write a one-off migration/backfill for existing commissions if any exist.

### Implementation
Extend `approve` so the same `$transaction` that flips statuses also reverses each creator's wallet and commissions. Keep the provider `refundPayment()` call **outside** the transaction (it's network I/O), as today.

```ts
async approve(id: string, adminId: string) {
  const refund = await prisma.refund.findUnique({
    where: { id },
    include: {
      payment: { select: { provider: true, providerPaymentId: true, providerResponse: true } },
      order: {
        select: {
          id: true, totalAmount: true, buyerId: true,
          items: { include: { product: { select: { creatorId: true } } } },
        },
      },
    },
  });
  if (!refund) throw new NotFoundException('Refund not found');
  if (refund.status !== 'PENDING') throw new BadRequestException('Only pending refunds can be approved');

  // Best-effort provider refund (network) — outside the transaction.
  let providerRefundId: string | undefined;
  try {
    const provider = this.providerFactory.get(refund.payment.provider);
    const pr = (refund.payment.providerResponse as any) || {};
    const result = await provider.refundPayment({
      providerPaymentId: refund.payment.providerPaymentId || pr.reference || '',
      amount: refund.order.totalAmount.toNumber(),
      reason: refund.reason,
    });
    providerRefundId = result.providerRefundId;
  } catch (err) {
    console.error('Provider refund failed (continuing case approval):', err);
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Idempotent claim on the refund.
    const claim = await tx.refund.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'APPROVED', approvedBy: adminId, approvedAt: new Date(), providerRefundId },
    });
    if (claim.count === 0) throw new BadRequestException('Refund is no longer pending');

    await tx.payment.update({ where: { id: refund.paymentId }, data: { status: 'REFUNDED' } });
    await tx.order.update({ where: { id: refund.orderId }, data: { status: 'REFUNDED' } });

    // Reverse each creator's wallet + commissions for this order.
    const commissions = await tx.commission.findMany({
      where: { orderId: refund.orderId, status: { in: ['PENDING', 'APPROVED'] } },
    });
    const byCreator = groupBy(commissions, (c) => c.creatorId); // creatorProfile.id

    const profiles = await tx.creatorProfile.findMany({
      where: { id: { in: Object.keys(byCreator) } },
      select: { id: true, userId: true },
    });
    const userIdByProfile = new Map(profiles.map((p) => [p.id, p.userId]));

    for (const [profileId, rows] of Object.entries(byCreator)) {
      const creatorUserId = userIdByProfile.get(profileId);
      if (!creatorUserId) continue;

      // Net that was credited = gross - fee. Reverse exactly that.
      const grossCommission = rows.reduce((s, r) => s.add(r.amount), new Prisma.Decimal(0));
      // The wallet was credited with (gross - commission); recompute the net reversal.
      // Simplest correct approach: reverse the recorded SALE walletTransaction net.
      const saleTx = await tx.walletTransaction.findFirst({
        where: { referenceType: 'ORDER', referenceId: refund.orderId, type: 'SALE',
                 wallet: { userId: creatorUserId } },
      });
      const net = saleTx ? saleTx.amount : new Prisma.Decimal(0);

      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: creatorUserId } });
      const before = wallet.availableBalance;

      // Debit the net; allow the balance to go negative only if you intend to
      // claw back already-paid-out funds. Otherwise clamp and flag for review.
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { decrement: net },
          lifetimeEarnings: { decrement: net },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'REFUND',
          amount: net.neg(),
          balanceBefore: before,
          balanceAfter: before.sub(net),
          description: 'Sale refunded',
          referenceType: 'REFUND',
          referenceId: refund.id,
        },
      });

      await tx.commission.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { status: 'REVERSED' },
      });
    }

    return tx.refund.findUniqueOrThrow({ where: { id } });
  });

  void this.notificationsService.create(
    refund.order.buyerId, 'REFUND_REQUEST', 'Refund approved',
    `Your refund of ${refund.order.totalAmount.toNumber()} NGN for order ${refund.orderId.slice(0, 8).toUpperCase()} has been approved.`,
    { orderId: refund.orderId, refundId: refund.id },
  );

  return updated;
}
```

### Edge cases to decide (product + finance)
- **Already-paid-out funds:** if a creator already withdrew, the wallet may go negative. Decide: clamp at 0 + create a `ledger` debt entry, or allow negative and block future payouts. Document the choice.
- **Partial refunds:** current code is full-refund only (`amount = order.totalAmount`). If partial refunds are ever added, the reversal must be proportional.
- **Double-entry ledger:** the schema has `LedgerAccount`/`LedgerEntry`/`LedgerTransaction` but nothing writes to them. If finance needs auditable books, post balanced entries here too (out of scope for this ticket, but note the gap).

### Tests
- Approve a refund for a 2-creator order → each creator wallet debited by their net, all commissions `REVERSED`, order/payment `REFUNDED`.
- Approve twice → second call rejected, no double debit.

### Acceptance criteria
- Sum of creator wallet credits for an order = 0 after a full refund.

---

## C5 — Download authorization + limit enforcement

**Severity:** Critical. **Files:** [`downloads.controller.ts`](apps/api/src/downloads/downloads.controller.ts), [`downloads.service.ts`](apps/api/src/downloads/downloads.service.ts).

### Root cause
1. `GET /downloads/file/:token` has **no auth guard** and returns fresh signed URLs.
2. `getDownloadByToken` never checks the caller owns the download.
3. `getFile` does **not** increment `downloadCount`, so the `maxDownloads` cap enforced only in `recordDownload` is bypassed by hitting the GET route.
4. `recordDownload` has a TOCTOU: it checks the count, then increments non-atomically.

### Implementation

**Step 1 — Require auth + verify ownership on every download route.**

```ts
// downloads.controller.ts
@Get('file/:token')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
async getFile(@Request() req, @Param('token') token: string) {
  return this.downloadsService.getDownloadFileUrl(token, req.user.sub);
}
```

Thread `userId` through the service and enforce ownership + limits in one atomic step:

```ts
// downloads.service.ts
async getDownloadByToken(token: string, userId: string) {
  const download = await prisma.download.findUnique({
    where: { token },
    include: { product: { select: { id: true, title: true, slug: true } } },
  });
  if (!download) throw new NotFoundException('Download not found');
  if (download.userId !== userId) throw new ForbiddenException('Not authorized for this download');
  if (new Date() > download.expiresAt) throw new BadRequestException('Download link has expired');
  return download;
}
```

**Step 2 — Make the limit atomic (fixes TOCTOU + closes the GET bypass).**
Count a download at the moment a signed URL is issued, using a guarded update:

```ts
async issueSignedUrls(token: string, userId: string) {
  const download = await this.getDownloadByToken(token, userId);

  // Atomically consume one download slot; fails if the cap is hit.
  const consumed = await prisma.download.updateMany({
    where: { id: download.id, downloadCount: { lt: prisma.download.fields.maxDownloads } },
    data: { downloadCount: { increment: 1 } },
  });
  if (consumed.count === 0) throw new BadRequestException('Download limit reached');

  await prisma.downloadLog.create({
    data: { downloadId: download.id, success: true },
  });

  const files = await prisma.productFile.findMany({ where: { productId: download.productId } });
  return Promise.all(files.map(async (f) => ({
    fileName: f.fileName,
    fileSize: f.fileSize.toString(),
    mimeType: f.mimeType,
    downloadUrl: await this.storageService.getSignedDownloadUrl(f.fileKey, 3600),
  })));
}
```

> `prisma.download.fields.maxDownloads` enables a column-to-column comparison in Prisma 5+. If your version doesn't support it, use a raw `UPDATE ... WHERE download_count < max_downloads RETURNING` via `$executeRaw`.

**Step 3 — Collapse `getFile` / `recordDownload` / `getDownloadFileUrl` into `issueSignedUrls`** so there is exactly **one** metered path. Update the frontend to call it.

### Tests
- User A cannot fetch User B's token (403).
- 11th download on a `maxDownloads: 10` link → 400, even alternating between GET and POST routes.
- Concurrent requests at count 9 → at most one crosses the cap.

### Acceptance criteria
- No unauthenticated or cross-user path returns signed URLs.
- The download cap holds under concurrency and across all routes.

---

# M3 — Security & session hardening

## H2 — Rate limiting + security headers

**Severity:** High. **Files:** `apps/api/package.json`, [`main.ts`](apps/api/src/main.ts), [`app.module.ts`](apps/api/src/app.module.ts), auth controller.

### Implementation
1. Install:

```bash
npm install --workspace @creatormarket/api @nestjs/throttler helmet
```

2. Global throttler in `app.module.ts`:

```ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]), // 100 req/min default
    // ...existing
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
```

3. Tighter limits on auth endpoints (per-route override):

```ts
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { ttl: 60_000, limit: 5 } }) // 5/min
@Post('login')
async login(...) { ... }
```
Apply to `login`, `register`, `forgot-password`, `reset-password`, `resend-verification`.

4. **Exclude webhooks** from throttling (`@SkipThrottle()` on webhook routes) — providers legitimately burst.

5. Helmet in `main.ts`:

```ts
import helmet from 'helmet';
app.use(helmet());
```

6. Use a **Redis throttler storage** (`@nestjs/throttler` + `ioredis` storage adapter) so limits hold across multiple API instances — Redis is already in the stack.

### Acceptance criteria
- 6th login attempt in a minute → 429.
- Security headers present on responses; webhooks unaffected.

---

## H3 — Wire the refresh-token flow on the client

**Severity:** High. **Files:** [`apps/web/src/lib/auth.tsx`](apps/web/src/lib/auth.tsx), [`apps/web/src/lib/api.ts`](apps/web/src/lib/api.ts).

### Root cause
The server issues + rotates refresh tokens ([auth.service.ts:132](apps/api/src/auth/auth.service.ts:132)), but the web app stores only `accessToken` and [`refresh()`](apps/web/src/lib/auth.tsx:96) just re-fetches the profile with the same token. Access tokens expire at **15m**, so users are logged out every 15 minutes.

### Implementation
1. Persist the refresh token. **Preferred:** have the API set the refresh token as an `httpOnly; Secure; SameSite=Strict` cookie (immune to XSS) rather than returning it in the JSON body. This also mitigates the localStorage XSS exposure of the access token.
   - Update `AuthController.login/register/refresh` to `res.cookie('refresh_token', token, { httpOnly: true, secure: true, sameSite: 'strict', path: '/api/v1/auth' })`.
   - `refresh` reads the cookie, rotates, sets the new cookie, returns a new access token.

2. Add a real `refresh()` in `api.ts`:

```ts
async refresh(): Promise<{ accessToken: string }> {
  return this.fetch('/auth/refresh', { method: 'POST' /* cookie sent automatically */ });
}
```

3. In `auth.tsx`, refresh on 401 and proactively before expiry:

```ts
// On any api call that 401s, attempt one refresh then retry.
// Also set a timer for ~1 min before the 15m access token expires.
```
Implement a single-flight refresh (dedupe concurrent 401s into one refresh call).

4. On `logout`, call `POST /auth/logout` so the server revokes the session (currently the client just drops the token locally).

### Acceptance criteria
- A session survives past 15 minutes without re-login.
- Refresh token is not readable by JS (httpOnly cookie).
- Logout revokes the server session.

---

## H5 — Secret hygiene / fail-fast config

**Severity:** High. **Files:** [`packages/config/src/index.ts`](packages/config/src/index.ts), [`auth.module.ts`](apps/api/src/auth/auth.module.ts), [`jwt.strategy.ts`](apps/api/src/auth/jwt.strategy.ts), [`main.ts`](apps/api/src/main.ts).

### Root cause
`config` hardcodes `JWT_SECRET = 'your-super-secret-jwt-key-change-in-production'`. Meanwhile `auth.module` and `jwt.strategy` read `JWT_SECRET` **directly from env with no fallback** — if unset, sign/verify secret is `undefined` and auth breaks silently.

### Implementation
1. Add a startup validation (env schema) — fail fast if required secrets are missing in production:

```ts
// apps/api/src/config/validate-env.ts
const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'];
export function validateEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  if (process.env.NODE_ENV === 'production' &&
      process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
    throw new Error('Refusing to boot with the default JWT secret in production');
  }
}
```
Call `validateEnv()` at the top of `bootstrap()` in `main.ts`.

2. Remove the insecure literal fallback from `packages/config`. Use `ConfigModule.forRoot({ validate })` or the schema above as the single source of truth.

3. Ensure `jwt.strategy` and `auth.module` read from the same validated source.

### Acceptance criteria
- App refuses to boot without `JWT_SECRET` (and with the default value in prod).
- Sign and verify use the identical secret.

---

# M4 — Money precision + performance

## H4 — Keep money in Decimal end-to-end

**Severity:** High. **Files:** [`orders.service.ts`](apps/api/src/orders/orders.service.ts), [`payments.service.ts`](apps/api/src/payments/payments.service.ts), provider files.

### Root cause
`Decimal` is converted via `.toNumber()` and arithmetic done in JS floats (`unitPrice * quantity`, `gross * rate/100`). `.toFixed(2)` hides but doesn't remove rounding error.

### Implementation
- Do all money arithmetic with `Prisma.Decimal` (`.add/.sub/.mul/.div/.toDecimalPlaces(2)`). C1/C3/C4 code above already models this.
- In `orders.service.create`, compute `totalPrice` and `totalAmount` in Decimal; only convert to number at the API boundary (the `toJSON` shim in `main.ts` already serializes Decimal → number for responses).
- Providers: convert to minor units at the very last step (`amount.mul(100).toNumber()` for kobo).
- Add a small `packages/shared/money.ts` with helpers (`toKobo`, `toMinorUnits`, `sum`) so the rounding rules live in one place.

### Acceptance criteria
- A `unit test` summing e.g. `33.33 × 3` and applying a 10% fee produces exact expected Decimals, not `9.999999...`.

---

## P1 — Eliminate N+1 in broadcast paths

**Files:** [`payments.service.ts`](apps/api/src/payments/payments.service.ts) (creator lookup), [`products.service.ts`](apps/api/src/products/products.service.ts) (`notifyPriceDrop`).

- `fulfillOrder` did `user.findFirst` per creator — fixed in C1 by resolving all profiles in one `findMany({ where: { id: { in } } })`.
- `notifyPriceDrop` does `user.findUnique` per wishlist user ([:447](apps/api/src/products/products.service.ts:447)). Replace with a single `user.findMany({ where: { id: { in: userIds } } })` and map.

### Acceptance criteria
- Fulfillment and price-drop paths issue O(1) user queries regardless of recipient count.

---

## P2 — Don't write on the product read path

**Files:** [`products.service.ts`](apps/api/src/products/products.service.ts) (`findBySlug`).

`findBySlug` synchronously increments `viewCount` on every detail view, serializing on hot products and bloating WAL.

- **Option A (quick):** fire-and-forget the increment (`void prisma.product.update(...)`) so the read isn't blocked.
- **Option B (scalable):** buffer view counts in Redis (`INCR product:views:<id>`) and flush to Postgres periodically via `apps/workers`. Preferred at scale.

### Acceptance criteria
- Product detail reads do not block on a write; view counts remain approximately correct.

---

## P3 — Composite indexes for the common queries

**Files:** [`schema.prisma`](packages/database/prisma/schema.prisma) + a migration.

The public listing filters `status = 'PUBLISHED'` ordered by `createdAt desc`, but `Product` has only single-column indexes. Add:

```prisma
@@index([status, createdAt])   // public listing
@@index([creatorId, status])   // creator dashboard
```
Consider `@@index([status, rating])` if "top rated" listings exist. Run `npm run db:migrate` to generate the migration; review the generated SQL before applying.

### Acceptance criteria
- `EXPLAIN` on the listing query uses the composite index (no full scan/filesort at scale).

---

## P4 — Search index reconciliation

**Files:** [`products.service.ts`](apps/api/src/products/products.service.ts) (`syncSearchIndex`), `apps/workers`.

`syncSearchIndex` swallows all errors (correct for availability) but nothing reconciles Meilisearch drift. Add a periodic worker job (`apps/workers/src/jobs/search-index.ts`) that re-syncs `PUBLISHED` products in batches on a schedule, and a `POST /admin/search/reindex` trigger.

### Acceptance criteria
- A product that failed to index is picked up by the next reconcile run.

---

# M5 — Type safety & cleanup

## Q1 — Remove `where: any` / `as any`
**Files:** orders/products/services with `const where: any = {}`.
Use Prisma's generated input types (`Prisma.ProductWhereInput`, `Prisma.OrderWhereInput`). This restores compile-time safety on filters — several of the money bugs would have been caught earlier with proper typing.

## Q2 — Extract pagination helper
**Files:** ~8 services duplicate `{ page, perPage, total, totalPages }`.
Add `packages/shared/pagination.ts`:
```ts
export function paginate(page = 1, perPage = 20) {
  const p = Math.max(1, page); const size = Math.min(100, Math.max(1, perPage));
  return { skip: (p - 1) * size, take: size, page: p, perPage: size };
}
export function pageMeta(page, perPage, total) {
  return { page, perPage, total, totalPages: Math.ceil(total / perPage) };
}
```
Also **cap `perPage`** (currently unbounded — a client can request `perPage=1000000`).

## Q3 — De-duplicate schema columns — ⏸️ DEFERRED (separate migration)
**Files:** [`schema.prisma`](packages/database/prisma/schema.prisma) + web.
Confirmed during M5: `Product.rating` and `Review.helpful` are **dead columns** — the
code only ever writes `Product.averageRating` (in `updateProductRating`) and
`Review.helpfulCount` (in `helpfulReview`); `rating`/`helpful` stay at their `0`
default. The `@@index([rating])` on `Product` therefore indexes a constant.

Not done here because it is a **destructive DB migration that also crosses into
the web app** (product cards / review lists may read `product.rating` /
`review.helpful`). Do it as its own reviewed change:
1. Grep `apps/web` and `apps/admin` for `.rating`/`.helpful` reads; repoint any to
   `averageRating`/`helpfulCount`.
2. Drop `Product.rating`, `Review.helpful`, and `@@index([rating])` from the schema.
3. Generate a Prisma **migration** (not `db push`) so the column drop is reviewable
   and reversible in production.

## Q4 — Workspace dependency hygiene — ⏸️ DEFERRED
**Files:** root [`package.json`](package.json).
`@nestjs/*`, `effect`, `rxjs`, `@types/multer` live in the **root** `dependencies`
but belong in `apps/api`. Purely hygienic — they resolve fine via hoisting today.
Deferred because moving them requires a full `npm install`, which in this
environment repeatedly corrupts `@babel/types` (drops its `package.json`) and
breaks the Jest harness. Bundle this with a clean `rm -rf node_modules && npm ci`
on a machine where that install is stable, and pin `@babel/types` at the same time.

## Q5 — Remove dead imports / unused code — ✅ DONE (partial)
Removed the unused `uuidv4` import from `orders.service`. The unused ledger models
(`LedgerAccount`/`LedgerEntry`/`LedgerTransaction`) remain — reconcile them with
either a double-entry implementation ticket (tie into fulfillment/refund) or a
schema-cleanup note; left as a product/finance decision, not deleted blindly.

### Acceptance criteria
- `npm run typecheck` passes with no `any` in query filters.
- `perPage` is capped; pagination logic lives in one place.

---

# Cross-cutting: CI gate

Update [`.github/workflows/ci.yml`](.github/workflows/ci.yml) to run, on every PR, with a Postgres service container:

```yaml
- run: npm ci
- run: npm run db:push        # against the CI Postgres
- run: npm run typecheck
- run: npm run lint
- run: npm run test           # includes the new money-flow integration tests
```
Block merges on failure. This is what makes M1/M2 stay fixed.

---

# Summary checklist

| ID | Item | Milestone | Done when |
|----|------|-----------|-----------|
| H1 | Test harness + CI | M0 | Suite runs in CI |
| C1 | Atomic fulfillment | M1 | No partial writes on failure |
| C2 | Idempotent webhooks | M1 | Wallet credited once under concurrency |
| C3 | Wallet double-spend | M1 | Balance can't go negative |
| C4 | Refund reverses earnings | M2 | Order net-zero after full refund |
| C5 | Download auth + limits | M2 | No cross-user / uncapped downloads |
| H2 | Rate limit + helmet | M3 | Auth throttled, headers set |
| H3 | Refresh-token flow | M3 | Sessions survive >15m |
| H5 | Fail-fast secrets | M3 | No boot without JWT secret |
| H4 | Decimal money math | M4 | Exact arithmetic in tests |
| P1–P4 | Performance | M4 | O(1) queries, indexed listings |
| Q1–Q5 | Cleanup | M5 | Typecheck clean, capped pagination |
