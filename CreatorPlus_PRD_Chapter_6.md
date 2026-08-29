# CreatorPlus PRD

## Chapter 6 --- Database Design & Data Model

------------------------------------------------------------------------

# Purpose

This chapter defines the logical database architecture for
CreatorPlus. The schema is organized into domains to maximize
maintainability, scalability, and future expansion.

> **Database Engine:** PostgreSQL 18\
> **ORM:** Prisma ORM

------------------------------------------------------------------------

# Design Principles

-   UUID primary keys for all business entities
-   Immutable financial ledger
-   Soft deletes where appropriate
-   Audit timestamps on all mutable records
-   Referential integrity through foreign keys
-   Optimized indexing for search and reporting
-   Event-friendly schema for asynchronous processing

------------------------------------------------------------------------

# Naming Conventions

## Tables

-   snake_case
-   plural nouns

Examples:

-   users
-   products
-   orders
-   creator_profiles

## Columns

-   snake_case
-   foreign keys end with `_id`
-   timestamps:
    -   created_at
    -   updated_at
    -   deleted_at (optional)

------------------------------------------------------------------------

# Domain Model

``` text
Identity
├── Users
├── Roles
├── Permissions
└── Sessions

Marketplace
├── Products
├── Categories
├── Collections
└── Reviews

Commerce
├── Cart
├── Orders
├── Payments
└── Refunds

Finance
├── Wallets
├── Ledger
├── Payouts
└── Commissions

Content
├── Files
├── Versions
├── Licenses
└── Downloads

Growth
├── Affiliates
├── Coupons
├── Notifications
└── Analytics
```

------------------------------------------------------------------------

# Core Table Groups

## Identity

-   users
-   user_profiles
-   roles
-   permissions
-   role_permissions
-   user_roles
-   sessions
-   devices
-   api_tokens
-   login_attempts

------------------------------------------------------------------------

## Creator Domain

-   creator_profiles
-   creator_verifications
-   creator_bank_accounts
-   creator_social_links
-   creator_followers
-   creator_collections

------------------------------------------------------------------------

## Marketplace

-   categories
-   category_translations
-   tags
-   product_tags
-   collections
-   collection_products

------------------------------------------------------------------------

## Product Domain

-   products
-   product_versions
-   product_files
-   product_images
-   product_previews
-   product_pricing
-   product_licenses
-   product_metadata
-   product_attributes
-   product_faqs

------------------------------------------------------------------------

## Commerce

-   carts
-   cart_items
-   orders
-   order_items
-   payment_attempts
-   payments
-   refunds
-   invoices

------------------------------------------------------------------------

## Downloads

-   download_tokens
-   download_logs
-   download_devices
-   license_keys
-   license_activations

------------------------------------------------------------------------

## Reviews

-   reviews
-   review_votes
-   review_reports

------------------------------------------------------------------------

## Finance

-   wallets
-   wallet_transactions
-   ledger_accounts
-   ledger_transactions
-   ledger_entries
-   commissions
-   payout_requests
-   payouts
-   payout_batches

------------------------------------------------------------------------

## Affiliate

-   affiliates
-   affiliate_links
-   affiliate_clicks
-   affiliate_conversions
-   affiliate_commissions

------------------------------------------------------------------------

## Coupons

-   coupons
-   coupon_redemptions

------------------------------------------------------------------------

## Notifications

-   notifications
-   notification_preferences
-   notification_templates
-   email_queue

------------------------------------------------------------------------

## Messaging

-   conversations
-   conversation_members
-   messages
-   attachments

------------------------------------------------------------------------

## Administration

-   audit_logs
-   moderation_actions
-   support_tickets
-   ticket_messages
-   system_settings
-   feature_flags

------------------------------------------------------------------------

# Entity Relationships

``` text
User
 ├── Creator Profile
 ├── Orders
 ├── Wallet
 ├── Reviews
 └── Notifications

Creator
 ├── Products
 ├── Collections
 ├── Followers
 └── Payouts

Product
 ├── Files
 ├── Images
 ├── Versions
 ├── Reviews
 ├── Licenses
 └── Downloads

Order
 ├── Order Items
 ├── Payment
 └── Invoice
```

------------------------------------------------------------------------

# Required Indexes

## Products

-   slug
-   creator_id
-   category_id
-   status
-   published_at

## Orders

-   buyer_id
-   payment_status
-   created_at

## Downloads

-   order_item_id
-   product_id
-   created_at

## Ledger

-   account_id
-   transaction_id

------------------------------------------------------------------------

# Soft Delete Strategy

Soft delete:

-   products
-   collections
-   creator_profiles
-   categories
-   coupons

Hard delete:

-   temporary upload sessions
-   cache tables
-   expired download tokens

------------------------------------------------------------------------

# Audit Strategy

Every mutable entity records:

-   created_at
-   updated_at
-   created_by
-   updated_by

Administrative actions are written to:

-   audit_logs

------------------------------------------------------------------------

# File Storage Model

Files are stored in Cloudflare R2.

Database stores only metadata:

-   bucket
-   object_key
-   checksum
-   mime_type
-   file_size
-   storage_provider
-   uploaded_at

------------------------------------------------------------------------

# Product Versioning

Every update creates a new version.

Fields include:

-   version_number
-   release_notes
-   created_at
-   published_by

Buyers always retain access to purchased versions where applicable.

------------------------------------------------------------------------

# Financial Ledger

Never modify balances directly.

Use immutable entries:

``` text
Ledger Transaction
        │
        ├── Debit Entry
        └── Credit Entry
```

Wallet balances are derived from ledger entries.

------------------------------------------------------------------------

# Future Expansion

Reserved domains:

-   subscriptions
-   SaaS products
-   APIs
-   plugin marketplace
-   enterprise licensing
-   team workspaces
-   mobile applications
-   AI-generated products

------------------------------------------------------------------------

# Estimated Schema Size

  Domain             Approx. Tables
  ---------------- ----------------
  Identity                       10
  Creator                         6
  Marketplace                     6
  Products                       10
  Commerce                        8
  Downloads                       5
  Reviews                         3
  Finance                         9
  Affiliate                       5
  Notifications                   4
  Messaging                       4
  Administration                  5
  Future Modules                40+

**Projected Total:** 120--170 tables after all roadmap phases.

------------------------------------------------------------------------

# Deliverables

This data model establishes the foundation for the API, services,
background workers, reporting, and future platform expansion.

**Next Chapter:** Chapter 7 --- REST API Specification & Service
Contracts.
