# CreatorMarket PRD

## Chapter 3 --- Functional Requirements (Module-by-Module)

------------------------------------------------------------------------

# Purpose

This chapter defines the functional behavior of every major module in
CreatorMarket. Each module includes its objective, key capabilities,
actors, and success criteria.

------------------------------------------------------------------------

# 3.1 Authentication & Identity

## Objective

Provide secure access for buyers, sellers, administrators, and staff.

### Features

-   Email/password registration
-   Email verification
-   Login/logout
-   Password reset
-   Two-factor authentication
-   Session management
-   Device management
-   Role-based access control
-   OAuth (future)

### Actors

-   Guest
-   Buyer
-   Seller
-   Admin

### Acceptance Criteria

-   Verified email required before selling.
-   Passwords are hashed.
-   Sensitive actions require re-authentication.

------------------------------------------------------------------------

# 3.2 Creator Onboarding

## Objective

Allow anyone to become a verified creator.

### Features

-   Creator profile
-   Public storefront
-   Identity verification
-   Tax/payment profile
-   Bank account
-   Social links
-   Bio
-   Portfolio

### Workflow

1.  Register
2.  Verify email
3.  Complete creator profile
4.  Submit verification
5.  Approval
6.  Store published

------------------------------------------------------------------------

# 3.3 Product Management

## Supported Product Types

-   eBooks
-   Templates
-   Source code
-   Graphics
-   Audio
-   Video
-   AI prompts
-   Digital planners
-   Fonts
-   Icons
-   CAD files
-   Bundles

### Features

-   Drafts
-   Product versions
-   Multiple files
-   Preview gallery
-   Cover image
-   Categories
-   Tags
-   Pricing
-   License selection
-   SEO metadata
-   Scheduled publishing

------------------------------------------------------------------------

# 3.4 Marketplace

## Home

-   Featured creators
-   Trending products
-   New arrivals
-   Staff picks
-   Flash sales
-   Collections

## Browse

-   Categories
-   Filters
-   Sort
-   Search suggestions

## Product Page

-   Gallery
-   Description
-   Version history
-   Reviews
-   Related products
-   Creator profile
-   License information

------------------------------------------------------------------------

# 3.5 Shopping Cart

Features

-   Add/remove items
-   Save for later
-   Coupon support
-   Multiple licenses
-   Estimated taxes (future)
-   Gift purchases (future)

------------------------------------------------------------------------

# 3.6 Checkout

Supported payment flow

1.  Cart
2.  Payment
3.  Verification
4.  Order creation
5.  Download unlocked
6.  Receipt generated

### Requirements

-   Idempotent checkout
-   Duplicate payment protection
-   Fraud checks
-   Inventory-independent

------------------------------------------------------------------------

# 3.7 Orders

Buyer can

-   View history
-   Download invoices
-   Re-download purchases
-   Track refunds

Seller can

-   View sales
-   Export reports
-   View buyer licenses

------------------------------------------------------------------------

# 3.8 Digital Downloads

Requirements

-   Signed URLs
-   Download history
-   Download limits (optional)
-   File version tracking
-   Purchase validation
-   Secure delivery from object storage

------------------------------------------------------------------------

# 3.9 Reviews

Buyers can

-   Rate products
-   Leave reviews
-   Upload screenshots (future)
-   Edit reviews

Admins can moderate reviews.

------------------------------------------------------------------------

# 3.10 Creator Storefront

Public profile includes

-   Banner
-   Avatar
-   Bio
-   Followers
-   Ratings
-   Products
-   Collections
-   Social links

------------------------------------------------------------------------

# 3.11 Wishlist

Users can

-   Save products
-   Organize into lists
-   Share lists
-   Receive price alerts

------------------------------------------------------------------------

# 3.12 Coupons

Creators can create

-   Percentage discounts
-   Fixed discounts
-   Limited-use coupons
-   Expiration dates
-   Product-specific coupons

------------------------------------------------------------------------

# 3.13 Affiliate System

Affiliates receive

-   Unique tracking links
-   Attribution
-   Dashboard
-   Earnings reports
-   Withdrawal requests

------------------------------------------------------------------------

# 3.14 Wallet & Payouts

Seller wallet

-   Pending balance
-   Available balance
-   Withdrawal history
-   Payout requests

Finance

-   Commission calculation
-   Settlement
-   Reconciliation

------------------------------------------------------------------------

# 3.15 Notifications

Channels

-   Email
-   In-app
-   Push (future)

Events

-   New sale
-   Product approved
-   Refund
-   Payout completed
-   Review received

------------------------------------------------------------------------

# 3.16 Search

Capabilities

-   Full-text search
-   Typo tolerance
-   Filters
-   Categories
-   Price ranges
-   Ratings
-   AI recommendations (future)

------------------------------------------------------------------------

# 3.17 Administration

Admin modules

-   Users
-   Sellers
-   Products
-   Orders
-   Payments
-   Reports
-   Reviews
-   Categories
-   Coupons
-   System settings
-   Audit logs

------------------------------------------------------------------------

# 3.18 Reports & Analytics

Platform

-   Revenue
-   GMV
-   Active users
-   Conversion rate
-   Top categories

Creator

-   Sales
-   Revenue
-   Downloads
-   Refunds
-   Conversion
-   Traffic sources

------------------------------------------------------------------------

# 3.19 Non-Functional Requirements

-   Mobile responsive
-   WCAG accessibility
-   Fast page loads
-   Horizontal scalability
-   Immutable financial ledger
-   Automated backups
-   Comprehensive audit logging

------------------------------------------------------------------------

# Deliverables

This chapter defines the functional scope of the MVP and forms the basis
for database design, APIs, and user stories.

**Next Chapter:** Chapter 4 --- User Stories & Acceptance Criteria
