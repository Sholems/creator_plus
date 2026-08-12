# CreatorMarket PRD

## Chapter 7 --- REST API Specification & Service Contracts

------------------------------------------------------------------------

# Purpose

This chapter defines the REST API standards, service boundaries,
endpoint conventions, request/response patterns, and integration
contracts for CreatorMarket.

> Architecture Style: RESTful APIs with asynchronous events for
> background processing.

------------------------------------------------------------------------

# API Standards

## Base URL

``` text
https://api.creatormarket.com/v1
```

Future versions:

``` text
/v2
/v3
```

------------------------------------------------------------------------

# Authentication

Mechanism

-   JWT Access Token
-   Refresh Token
-   HTTP Only Cookies (Web)
-   Bearer Token (API)

Headers

``` http
Authorization: Bearer <token>
```

------------------------------------------------------------------------

# Standard Response

Success

``` json
{
  "success": true,
  "message": "Operation completed.",
  "data": {}
}
```

Error

``` json
{
  "success": false,
  "message": "Validation failed.",
  "errors": []
}
```

------------------------------------------------------------------------

# Pagination

Query Parameters

``` text
?page=1
&per_page=20
&sort=created_at
&direction=desc
```

Response Metadata

``` json
{
  "pagination": {
    "page":1,
    "per_page":20,
    "total":500,
    "last_page":25
  }
}
```

------------------------------------------------------------------------

# Error Codes

  HTTP   Meaning
  ------ -----------------------
  200    Success
  201    Created
  204    No Content
  400    Bad Request
  401    Unauthorized
  403    Forbidden
  404    Not Found
  409    Conflict
  422    Validation Error
  429    Too Many Requests
  500    Internal Server Error

------------------------------------------------------------------------

# Authentication Endpoints

  Method   Endpoint
  -------- -----------------------
  POST     /auth/register
  POST     /auth/login
  POST     /auth/logout
  POST     /auth/refresh
  POST     /auth/forgot-password
  POST     /auth/reset-password
  POST     /auth/verify-email

------------------------------------------------------------------------

# User Endpoints

``` text
GET    /users/me
PATCH  /users/me
DELETE /users/me
GET    /users/settings
PATCH  /users/settings
```

------------------------------------------------------------------------

# Creator Endpoints

``` text
POST   /creators/apply
GET    /creators/profile
PATCH  /creators/profile
GET    /creators/storefront
GET    /creators/{slug}
POST   /creators/verification
```

------------------------------------------------------------------------

# Product Endpoints

``` text
GET    /products
GET    /products/{slug}
POST   /products
PATCH  /products/{id}
DELETE /products/{id}
POST   /products/{id}/publish
POST   /products/{id}/archive
POST   /products/{id}/versions
```

------------------------------------------------------------------------

# Category Endpoints

``` text
GET /categories
GET /categories/{slug}
```

------------------------------------------------------------------------

# Search

``` text
GET /search
GET /search/suggestions
GET /search/trending
```

Parameters

-   q
-   category
-   creator
-   min_price
-   max_price
-   rating
-   sort

------------------------------------------------------------------------

# Cart

``` text
GET    /cart
POST   /cart/items
PATCH  /cart/items/{id}
DELETE /cart/items/{id}
```

------------------------------------------------------------------------

# Checkout

``` text
POST /checkout
POST /checkout/verify
```

Requirements

-   Idempotency key
-   Duplicate payment protection
-   Fraud validation

------------------------------------------------------------------------

# Orders

``` text
GET /orders
GET /orders/{id}
GET /orders/{id}/invoice
```

------------------------------------------------------------------------

# Downloads

``` text
POST /downloads/{orderItemId}
GET  /downloads/history
```

Rules

-   Validate purchase
-   Generate signed URL
-   Record download event

------------------------------------------------------------------------

# Reviews

``` text
POST   /reviews
PATCH  /reviews/{id}
DELETE /reviews/{id}
GET    /products/{slug}/reviews
```

------------------------------------------------------------------------

# Coupons

``` text
POST /coupons
GET  /coupons
PATCH /coupons/{id}
```

------------------------------------------------------------------------

# Wallet

``` text
GET /wallet
GET /wallet/transactions
POST /wallet/payouts
GET /wallet/payouts
```

------------------------------------------------------------------------

# Affiliate

``` text
GET /affiliate/dashboard
GET /affiliate/links
POST /affiliate/links
GET /affiliate/commissions
```

------------------------------------------------------------------------

# Notifications

``` text
GET /notifications
PATCH /notifications/{id}/read
PATCH /notifications/read-all
```

------------------------------------------------------------------------

# Administration

``` text
GET    /admin/dashboard
GET    /admin/users
GET    /admin/products
POST   /admin/products/{id}/approve
POST   /admin/products/{id}/reject
GET    /admin/reports
GET    /admin/audit-logs
```

------------------------------------------------------------------------

# Webhooks

Incoming

``` text
POST /webhooks/paystack
POST /webhooks/flutterwave
POST /webhooks/stripe
```

Outgoing

-   Product approved
-   Payout completed
-   Refund completed
-   Affiliate conversion

------------------------------------------------------------------------

# Service Boundaries

## Identity Service

-   Authentication
-   Authorization
-   Sessions

## Marketplace Service

-   Products
-   Categories
-   Search
-   Collections

## Commerce Service

-   Cart
-   Checkout
-   Orders

## Finance Service

-   Payments
-   Wallets
-   Ledger
-   Payouts

## Creator Service

-   Storefront
-   Analytics
-   Followers

## Notification Service

-   Email
-   In-app
-   Push (future)

------------------------------------------------------------------------

# API Security

-   JWT validation
-   RBAC
-   Rate limiting
-   CSRF protection (web)
-   CORS policy
-   Request validation
-   File upload validation
-   Audit logging
-   Signed download URLs

------------------------------------------------------------------------

# API Documentation

Requirements

-   OpenAPI 3.1
-   Swagger UI
-   Example requests
-   Example responses
-   Authentication examples
-   Error examples

------------------------------------------------------------------------

# Deliverables

This chapter establishes the API contract between frontend, backend,
mobile clients, AI agents, and third-party integrations.

**Next Chapter:** Chapter 8 --- Authentication, Authorization & Security
Architecture.
