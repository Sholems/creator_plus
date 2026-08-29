# CreatorPlus Engineering Bible

## Chapter 21 --- Marketplace UX Refactor: Customer vs. Affiliate Marketplaces

------------------------------------------------------------------------

# Purpose

This chapter documents the separation of the marketplace into two distinct
experiences that share one backend, commission, and checkout engine:

1.  **Customer Marketplace** — buyers browse all published products with no
    affiliate information shown.
2.  **Affiliate Marketplace** — approved affiliates promote
    affiliate-approved products and earn creator-set commissions.

It records the routes, components, backend endpoints, and verification
results for the refactor.

------------------------------------------------------------------------

# 21.1 Navigation & Information Architecture

The site nav is split so the customer market and the affiliate program have
clear, distinct entry points.

| Nav label   | Route            | Destination                                        |
| ----------- | ---------------- | -------------------------------------------------- |
| Marketplace | `/marketplace`   | Alias -> `/products` (all published products)      |
| Categories  | `/categories`    | Category browsing                                  |
| Creators    | `/creators`      | Public creator directory (new)                     |
| Sell        | `/sell`          | Creator onboarding                                 |
| Earn        | `/earn`          | Affiliate program landing (new)                    |

Files changed: `apps/web/src/components/layout/header.tsx`,
`apps/web/src/components/layout/footer.tsx`.

Route aliases added so old/long URLs keep working:

| Alias path                  | Redirects to                       |
| --------------------------- | ---------------------------------- |
| `/marketplace`              | `/products`                        |
| `/product/[slug]`           | `/products/[slug]`                 |
| `/dashboard/affiliates`     | `/affiliate/dashboard`             |
| `/affiliates`               | `/earn`                            |

All redirects are server components calling `redirect()`.

------------------------------------------------------------------------

# 21.2 Backend Changes

## 21.2.1 Public creators directory

`GET /api/v1/creators` — lists active creators (`deletedAt IS NULL`) that
have at least one published product. Returns `{ data, total }` where each
creator includes `verified`, `followerCount`, and `productCount`.

- `apps/api/src/creators/creators.service.ts` -> `listActive()`
- `apps/api/src/creators/creators.controller.ts` -> `@Get() listActive` (registered before `storefront/:slug`)

## 21.2.2 Enhanced affiliate marketplace

`GET /api/v1/affiliates/marketplace` now accepts:

| Query param | Meaning                                             |
| ----------- | --------------------------------------------------- |
| `sort`      | trending (default), highest_earning, newest, best_selling, editor_picks, price_asc, price_desc |
| `category`  | filter by category slug                             |
| `search`    | title / short-description contains (case-insensitive) |
| `perPage`   | page size (clamped 1..120)                          |

Behavior:

- Only products that are `PUBLISHED`, not deleted, `affiliateEnabled`,
  `affiliateStatus = APPROVED`, and whose creator is not deleted.
- Response adds `total`, `categories`, and per-product `salesCount`
  (`_count.orderItems` filtered to `order.status = PAID`).
- `best_selling` cannot be ordered in the DB by Prisma's filtered
  `_count`; it pre-sorts by `affiliateClickCount` in the query and
  stable-sorts by `salesCount` in memory.

## 21.2.3 Affiliate self-service update

`PATCH /api/v1/affiliates/me` — updates application fields
(`UpdateAffiliateDto`: applicationMessage, promotionChannels, websiteUrl,
socialMediaLinks, country, paymentMethod, paymentDetails, code).

Rules:

- Status is preserved for `ACTIVE` / `PENDING` / `SUSPENDED`.
- `REJECTED` flips back to `PENDING` and clears `rejectionReason` /
  `rejectedAt`.
- Changing `code` regenerates a unique code via `generateUniqueCode`.
- An active affiliate is never automatically disabled by a settings update.

Files: `apps/api/src/affiliates/affiliates.service.ts`,
`apps/api/src/affiliates/affiliates.controller.ts`,
`apps/api/src/affiliates/dto/affiliate.dto.ts`.

------------------------------------------------------------------------

# 21.3 Web: New Pages & Routes

| Route                  | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `/earn`                | Affiliate program marketing landing (stats, how-it-works, CTA) |
| `/creators`            | Public creator directory grid                                  |
| `/affiliate/dashboard` | Stats, earnings by status, recent conversions, recent links    |
| `/affiliate/marketplace`| Search / sort / category-filter grid + generate link           |
| `/affiliate/products`  | My Links management (copy, enable/disable)                     |
| `/affiliate/analytics` | Per-link clicks / sales / revenue / commission                 |
| `/affiliate/earnings`  | Available / pending / total balances + payout request          |
| `/affiliate/settings`  | Update application profile                                     |

## 21.3.1 Affiliate gate (`components/affiliate/affiliate-gate.tsx`)

Access control for every `/affiliate/*` route:

| State            | Behavior                                        |
| ---------------- | ----------------------------------------------- |
| Guest            | `router.replace('/earn')`                       |
| No application   | Shows application form                          |
| `PENDING`        | Under-review screen                             |
| `REJECTED`       | Re-apply form (update mode re-submits)          |
| `SUSPENDED`/`BANNED` | Blocked screen                               |
| `ACTIVE`         | Gold referral-code bar + child routes           |

Exposes `useAffiliate()` (`me`, `refresh`) via context.

## 21.3.2 Cards

- `components/market/customer-product-card.tsx` — customer-facing:
  wishlist toggle (`api.addToWishlist` / `removeFromWishlist`), Buy Now
  (`api.createOrder` -> `/checkout?orderId=`). No commission/cookie/badge
  information. Includes `CustomerProductCardSkeleton`.
- `components/market/affiliate-product-card.tsx` — affiliate-facing: gold
  "You earn per sale" box, commission %, cookie days, Generate Link.
  Includes `AffiliateProductCardSkeleton`.
- The original `components/market/product-card.tsx` (and its `MarketProduct`
  type) was fully replaced by `CustomerProductCard` across all customer
  grids (homepage featured, `/products` listing, related products, creator
  storefronts) and the file deleted.

## 21.3.3 Homepage

- New "Affiliate picks" section (customer-facing, no commission shown),
  fed by `getAffiliateMarketplace({ sort: 'best_selling', perPage: 8 })`.
- Hero stall teaser already links to `/earn`.

## 21.3.4 Product page affiliate CTA

`apps/web/src/app/(marketplace)/products/[slug]/page.tsx` renders an
"Earn money promoting this product" banner when the product is
`affiliateEnabled` and `affiliateStatus = APPROVED`:

- Active affiliate -> "Generate Affiliate Link" -> `/affiliate/marketplace`
- Everyone else -> "Become an Affiliate" -> `/earn`

`isAffiliateActive` is resolved via `getAffiliateMe(token)`.

## 21.3.5 Client API (`apps/web/src/lib/api.ts`)

- `getAffiliateMarketplace(params)` — sends sort/category/search/perPage;
  returns settings/products/categories/total
- `getAffiliateMe(token)`, `getAffiliateLinks(token)`
- `updateAffiliateMe(token, data)`
- `getCreatorsDirectory()`
- `applyAffiliate` now includes `socialMediaLinks`

------------------------------------------------------------------------

# 21.4 Verification

## 21.4.1 Builds

- API: `nest build` (from `apps/api`) — clean.
- Web: `next build` (from `apps/web`, Next 16.3 / Turbopack, typedRoutes) —
  clean; all 54 routes compile. New routes registered: `/creators`,
  `/earn`, `/affiliate/*`, `/marketplace`, `/product/[slug]`.

## 21.4.2 Playwright (headless Chromium) against running dev servers

| Check                                                         | Result |
| ------------------------------------------------------------- | ------ |
| Guest `/affiliate/dashboard` redirects to `/earn`             | PASS   |
| Guest `/affiliate/marketplace` redirects to `/earn`           | PASS   |
| `/marketplace` alias -> `/products`                           | PASS   |
| `/product/<slug>` alias -> `/products/<slug>`                 | PASS   |
| `/dashboard/affiliates` redirects away                        | PASS   |
| `/earn` landing renders                                       | PASS   |
| `/creators` directory renders (6 creators)                    | PASS   |
| Homepage "Affiliate picks" section renders                    | PASS   |
| Product page affiliate CTA (guest)                            | PASS   |
| Login as sarah@example.com -> `/dashboard`                    | PASS   |
| Affiliate dashboard renders (no redirect), gold code bar      | PASS   |
| Affiliate marketplace renders + Generate Link produces link   | PASS   |
| My Links / Analytics / Earnings / Settings render             | PASS   |
| Active affiliate sees "Generate Affiliate Link" CTA           | PASS   |

## 21.4.3 API regression checks (after restart)

- `GET /api/v1/creators` -> 6 creators with verified/productCount fields
- `GET /api/v1/affiliates/marketplace?sort=best_selling` -> 200 (fixed:
  Prisma filtered-`_count` orderBy replaced with in-memory sort)
- `perPage` honored (perPage=4 -> 4 products)
- `search=prompt` filters correctly

------------------------------------------------------------------------

# 21.5 Operations Notes

- The API runs `node dist/main.js` (production build, not watch mode). After
  backend changes: `nest build` then restart the process. The process was
  restarted during this work; logs: `apps/api/api-server.log`,
  `apps/api/api-server.err.log`.
- The web dev server was running during verification; a `next build` was run
  against the same `.next` directory without issue, but avoid running a
  production build and a dev server on the same `.next` concurrently in
  future.

------------------------------------------------------------------------

# 21.6 Out of Scope / Future Work

- Full apply -> admin approve -> first conversion Playwright journey (covered
  by the gate states and API checks, but not driven end-to-end as a new
  user).
- The homepage hero was simplified to badge + headline + tagline + search
  (Popular-search chips, hero CTA buttons, the "Creators keep 90%…" line,
  and the trust strip were removed).
