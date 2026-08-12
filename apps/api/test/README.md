# API tests

Two tiers:

- **Unit tests** (`src/**/*.spec.ts`) — pure logic, no database. Fast.
  Example: `src/common/money.spec.ts`.
- **Integration tests** (`test/**/*.spec.ts`) — run against a **real Postgres**.
  Money flows are never tested against a mock.

## Running

Unit tests only:

```bash
npm run test --workspace @creatormarket/api -- src/common
```

Integration tests — point `DATABASE_URL` at a throwaway database first, then push
the schema:

```bash
docker compose up -d postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/creatormarket_test npm run db:push
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/creatormarket_test npm run test --workspace @creatormarket/api -- test
```

Integration specs run serially (`maxWorkers: 1`) and `TRUNCATE ... CASCADE`
between tests, so never point them at a database with real data.

## What's covered

| Spec | Guards |
|---|---|
| `src/common/money.spec.ts` | Decimal money math (H4) |
| `test/payments.wallet.spec.ts` | Atomic fulfillment (C1), no wallet double-spend (C3) |
| `test/payments.fulfillment.spec.ts` | Idempotent duplicate/concurrent webhooks (C1, C2) |
