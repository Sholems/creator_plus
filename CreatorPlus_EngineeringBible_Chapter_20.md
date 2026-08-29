# CreatorPlus Engineering Bible

## Chapter 20 --- Complete Prisma Schema & Database Blueprint

------------------------------------------------------------------------

# Purpose

This chapter transitions from product requirements into implementation.
It defines the database conventions, schema organization, relationships,
and engineering standards that the development team should follow when
implementing the Prisma schema.

------------------------------------------------------------------------

# 20.1 Design Goals

-   UUID primary keys for all entities
-   PostgreSQL as the source of truth
-   Prisma ORM as the data access layer
-   Strict foreign-key constraints
-   Immutable financial records
-   Soft deletes where appropriate
-   Audit fields on mutable entities

------------------------------------------------------------------------

# 20.2 Schema Organization

Split the Prisma schema into domain-focused modules:

``` text
prisma/
 ├── schema.prisma
 ├── user.prisma
 ├── creator.prisma
 ├── product.prisma
 ├── order.prisma
 ├── wallet.prisma
 ├── affiliate.prisma
 ├── notification.prisma
 ├── audit.prisma
 └── common.prisma
```

------------------------------------------------------------------------

# 20.3 Core Entity Domains

Identity

-   User
-   Session
-   Role
-   Permission
-   ApiToken
-   Device

Marketplace

-   Product
-   Category
-   Collection
-   Tag
-   Review

Commerce

-   Cart
-   CartItem
-   Order
-   OrderItem
-   Payment
-   Refund
-   Invoice

Finance

-   Wallet
-   LedgerAccount
-   LedgerEntry
-   Payout
-   Commission

Growth

-   Affiliate
-   AffiliateClick
-   AffiliateConversion
-   Coupon

Operations

-   AuditLog
-   SupportTicket
-   Notification

------------------------------------------------------------------------

# 20.4 Common Fields

Every mutable model should include:

-   id (UUID)
-   createdAt
-   updatedAt
-   deletedAt (optional)
-   createdBy (optional)
-   updatedBy (optional)

------------------------------------------------------------------------

# 20.5 Relationship Standards

-   One-to-one where ownership is exclusive
-   One-to-many for transactional records
-   Many-to-many through explicit join tables
-   Cascade deletes only for dependent records
-   Restrict deletes for financial entities

------------------------------------------------------------------------

# 20.6 Indexing Strategy

Recommended indexes:

-   Slugs
-   Foreign keys
-   Status fields
-   Published dates
-   Created dates
-   Composite indexes for search filters

Use full-text search via Meilisearch rather than PostgreSQL for
marketplace discovery.

------------------------------------------------------------------------

# 20.7 Migration Strategy

Rules:

1.  Every schema change uses Prisma Migrate.
2.  Never edit applied migrations.
3.  Review destructive changes.
4.  Test migrations in staging.
5.  Roll forward whenever possible.

------------------------------------------------------------------------

# 20.8 Seed Data

Initial seed should create:

-   Super Administrator
-   Default roles
-   Permissions
-   Product categories
-   Feature flags
-   System settings

------------------------------------------------------------------------

# 20.9 Financial Integrity

Financial tables must never:

-   Use cascading deletes
-   Allow manual balance edits
-   Lose historical records

Corrections are implemented using compensating ledger entries.

------------------------------------------------------------------------

# 20.10 Deliverables

Implementation should include:

-   Complete Prisma schema
-   Migration history
-   Seed scripts
-   Database documentation
-   ER diagrams
-   Relationship validation tests

------------------------------------------------------------------------

## Next Chapter

**Chapter 21 --- OpenAPI 3.1 Specification & Backend Service Contracts**
