# Oja

The market for African digital creators — a multi-vendor marketplace for buying
and selling digital products, built for Nigeria first, expanding across Africa
and the world.

Sellers keep **90%** of every sale. Buyers pay in **Naira (₦)** via Paystack or
Flutterwave, or with international cards via Stripe.

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Backend:** NestJS, Prisma ORM
- **Database:** PostgreSQL
- **Cache:** Redis
- **Search:** Meilisearch
- **Storage:** Cloudflare R2
- **Payments:** Paystack (NGN), Flutterwave (pan-African), Stripe (international)
- **Deployment:** Docker, Turborepo

## Prerequisites

- Node.js 20+
- npm 10+ (workspaces — **not** pnpm/yarn)

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your values (at minimum
   `DATABASE_URL` and one payment provider key).

3. Set up the database:

   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

4. Start development:

   ```bash
   npm run dev
   ```

## Development Services

- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379
- **Meilisearch:** localhost:7700
- **API:** http://localhost:3001
- **Web:** http://localhost:3000
- **API Docs:** http://localhost:3001/api/docs

## Payments

Checkout works with any provider that has a secret key configured in `.env`.
Providers without a key are automatically hidden from the checkout picker.

- **Paystack** (`PAYSTACK_SECRET_KEY`) — primary for Nigeria. Amounts are sent
  in kobo (naira × 100).
- **Flutterwave** (`FLUTTERWAVE_SECRET_KEY`) — pan-African. Amounts are sent in
  whole naira. Webhooks are verified via the `verif-hash` header.
- **Stripe** (`STRIPE_SECRET_KEY`) — international cards. Amounts are sent in
  minor units. Webhooks verified via `stripe-signature`.

Provider webhooks are handled at `POST /api/v1/payments/webhook/:provider`.

## Project Structure

```
creatormarket/
├── apps/
│   ├── web/          # Next.js frontend (Oja marketplace)
│   ├── api/          # NestJS backend API
│   ├── admin/        # Admin dashboard
│   └── workers/      # Background workers
├── packages/
│   ├── ui/           # Shared UI components
│   ├── database/     # Prisma schema & client
│   ├── auth/         # Authentication utilities
│   ├── shared/       # Shared types & utilities
│   ├── config/       # Configuration
│   └── sdk/          # API SDK
├── docker-compose.yml
└── turbo.json
```

## Available Scripts

- `npm run dev` - Start all development servers
- `npm run build` - Build all applications
- `npm run lint` - Lint all packages
- `npm run typecheck` - Type check all packages
- `npm run test` - Run all tests
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Prisma Studio

## License

This project is licensed under the MIT License - see the LICENSE file for details.
