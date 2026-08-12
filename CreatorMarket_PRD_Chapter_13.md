# CreatorMarket PRD

## Chapter 13 --- Wallet, Ledger, Payouts & Financial Architecture

------------------------------------------------------------------------

# Purpose

This chapter defines the financial architecture that records every
monetary event, calculates creator earnings, manages payouts, and
provides an auditable accounting foundation.

------------------------------------------------------------------------

# 13.1 Financial Principles

-   Double-entry accounting
-   Immutable ledger
-   Complete audit trail
-   Provider-independent payment processing
-   Transparent creator earnings
-   Accurate reconciliation

------------------------------------------------------------------------

# 13.2 Financial Domains

-   Wallets
-   Ledger
-   Commissions
-   Payouts
-   Refunds
-   Chargebacks
-   Reconciliation
-   Finance Reporting

------------------------------------------------------------------------

# 13.3 Wallet Architecture

Each creator has one platform wallet.

Balances:

-   Pending Balance
-   Available Balance
-   Reserved Balance
-   Lifetime Earnings
-   Lifetime Payouts

Buyers may receive a wallet in future for store credits and refunds.

------------------------------------------------------------------------

# 13.4 Earnings Lifecycle

``` text
Order Paid
   ↓
Platform Commission Calculated
   ↓
Creator Earnings Pending
   ↓
Holding Period
   ↓
Available Balance
   ↓
Payout Requested
   ↓
Payout Approved
   ↓
Funds Sent
```

------------------------------------------------------------------------

# 13.5 Double-Entry Ledger

Every financial event creates balanced debit and credit entries.

Examples:

-   Sale
-   Refund
-   Payout
-   Chargeback
-   Commission
-   Adjustment

Ledger entries are immutable. Corrections are made using reversing
entries.

------------------------------------------------------------------------

# 13.6 Commission Engine

Supports:

-   Global default commission
-   Category-specific commission
-   Creator-specific agreements
-   Promotional commission campaigns

Commission calculation occurs before wallet settlement.

------------------------------------------------------------------------

# 13.7 Holding Period

Purpose:

-   Reduce fraud
-   Cover refund window
-   Protect against chargebacks

Configuration:

-   Global default
-   Creator-specific overrides
-   Category overrides (future)

------------------------------------------------------------------------

# 13.8 Payout Requests

Eligibility:

-   Identity verified
-   Minimum payout threshold met
-   Available balance sufficient
-   No compliance holds

Workflow:

``` text
Request
  ↓
Validation
  ↓
Finance Review
  ↓
Approval
  ↓
Provider Transfer
  ↓
Settlement
```

------------------------------------------------------------------------

# 13.9 Supported Payout Methods

Initial:

-   Bank Transfer

Future:

-   PayPal
-   Wise
-   Stripe Connect
-   Payoneer

------------------------------------------------------------------------

# 13.10 Refund Accounting

Refunds:

-   Reverse creator earnings where applicable
-   Reverse platform commission when required
-   Create ledger adjustment entries
-   Update reporting metrics

------------------------------------------------------------------------

# 13.11 Chargeback Handling

Lifecycle:

1.  Notification received
2.  Order flagged
3.  Funds reserved if necessary
4.  Evidence collection
5.  Decision recorded
6.  Ledger updated

------------------------------------------------------------------------

# 13.12 Financial Reconciliation

Daily reconciliation compares:

-   Internal ledger
-   Payment provider transactions
-   Bank settlements
-   Outstanding payouts

Any mismatch creates a reconciliation task.

------------------------------------------------------------------------

# 13.13 Finance Dashboard

Metrics:

-   Gross Merchandise Value
-   Platform Revenue
-   Creator Earnings
-   Pending Payouts
-   Completed Payouts
-   Refund Value
-   Chargeback Rate
-   Outstanding Reconciliation Items

------------------------------------------------------------------------

# 13.14 Audit & Compliance

Every financial action records:

-   Actor
-   Timestamp
-   Transaction reference
-   Related order
-   Before/after status
-   Approval history

------------------------------------------------------------------------

# 13.15 Reporting

Standard Reports:

-   Daily Revenue
-   Monthly Revenue
-   Creator Earnings
-   Commission Report
-   Refund Report
-   Payout Report
-   Ledger Export
-   Tax Summary (future)

Exports:

-   CSV
-   XLSX
-   PDF

------------------------------------------------------------------------

# 13.16 Security

-   Role-based finance permissions
-   Mandatory 2FA for finance users
-   Encrypted banking information
-   Approval workflow for payouts
-   Immutable financial history

------------------------------------------------------------------------

# 13.17 Future Enhancements

-   Multi-currency wallets
-   Automatic tax withholding
-   Revenue forecasting
-   AI anomaly detection
-   Escrow support
-   Subscription settlements

------------------------------------------------------------------------

# Deliverables

This chapter establishes the financial backbone of CreatorMarket,
ensuring every monetary event is traceable, balanced, secure, and
scalable.

**Next Chapter:** Chapter 14 --- Affiliate, Referral & Growth Engine.
