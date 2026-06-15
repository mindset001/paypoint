# Database Design
## PayPoint — MongoDB Schema Reference

---

## Collections Overview

| Collection | Purpose |
|-----------|---------|
| `users` | All user accounts (customers, agents, admins) |
| `wallets` | One wallet per user — balance + tier |
| `transactions` | Every financial event (debit, credit, refund) |
| `ledger` | Immutable double-entry record of every balance change |
| `services` | Available VTU services + pricing config |
| `agent_pricing` | Custom pricing overrides per agent |
| `commissions` | Commission and cashback records |
| `referrals` | Referral relationships and bonus tracking |
| `kyc_verifications` | KYC submission + verification status |
| `virtual_accounts` | Assigned virtual bank accounts |
| `api_keys` | Developer API keys |
| `webhooks` | Developer webhook registrations + delivery log |
| `notifications` | Notification log (SMS, email, push, in-app) |
| `fraud_flags` | Flagged transactions and accounts |
| `audit_logs` | Admin action log |

---

## 1. users

```js
{
  _id: ObjectId,
  firstName: String,         // required
  lastName: String,          // required
  email: {
    address: String,         // unique, lowercase
    verified: Boolean,
    verifiedAt: Date
  },
  phone: {
    number: String,          // unique, E.164 format e.g. +2348012345678
    verified: Boolean,
    verifiedAt: Date
  },
  passwordHash: String,      // bcrypt
  pinHash: String,           // bcrypt — transaction PIN
  role: {
    type: String,
    enum: ['customer', 'agent', 'sub_agent', 'admin', 'developer'],
    default: 'customer'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending_kyc'],
    default: 'active'
  },
  referralCode: String,      // unique, auto-generated
  referredBy: ObjectId,      // ref: users
  agentId: ObjectId,         // ref: users — for sub_agents, their parent agent
  twoFactorEnabled: Boolean,
  twoFactorSecret: String,   // TOTP secret (encrypted)
  deviceFingerprints: [String],
  lastLoginAt: Date,
  lastLoginIp: String,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
  { "email.address": 1 }  unique
  { "phone.number": 1 }   unique
  { referralCode: 1 }     unique
  { role: 1, status: 1 }
  { agentId: 1 }
```

---

## 2. wallets

```js
{
  _id: ObjectId,
  userId: ObjectId,          // ref: users — unique per user
  balance: Decimal128,       // always in kobo (integer) to avoid float issues
  currency: { type: String, default: 'NGN' },
  tier: {
    type: String,
    enum: ['basic', 'standard', 'premium'],
    default: 'basic'
  },
  dailySpendLimit: Decimal128,
  weeklySpendLimit: Decimal128,
  totalFunded: Decimal128,   // lifetime funded amount
  totalSpent: Decimal128,    // lifetime spent amount
  frozenAmount: Decimal128,  // amount locked for pending tx
  createdAt: Date,
  updatedAt: Date
}

Indexes:
  { userId: 1 }  unique
```

> **Note on kobo:** Store all monetary values as integers in kobo (1 NGN = 100 kobo) using `Decimal128` or `Number`. Never store NGN as a float. Display layer divides by 100.

---

## 3. transactions

```js
{
  _id: ObjectId,
  reference: String,         // unique — "PAY-{timestamp}-{nanoid}"
  userId: ObjectId,          // ref: users
  walletId: ObjectId,        // ref: wallets
  type: {
    type: String,
    enum: [
      'airtime', 'data', 'cable', 'electricity', 'exam', 'betting',
      'wallet_fund', 'wallet_transfer_debit', 'wallet_transfer_credit',
      'commission', 'cashback', 'referral_bonus', 'refund'
    ]
  },
  direction: {
    type: String,
    enum: ['debit', 'credit']
  },
  amount: Decimal128,        // in kobo
  fee: Decimal128,           // platform fee in kobo
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'reversed'],
    default: 'pending'
  },
  balanceBefore: Decimal128, // wallet balance before this tx
  balanceAfter: Decimal128,  // wallet balance after this tx
  meta: {
    // VTU specific
    network: String,         // MTN, Airtel, Glo, 9mobile
    phone: String,
    dataBundle: String,
    cableProvider: String,
    smartcardNumber: String,
    meterNumber: String,
    token: String,           // electricity token returned
    examType: String,
    examPin: String,
    bettingPlatform: String,
    bettingAccountId: String,
    // Wallet funding specific
    paystackReference: String,
    paystackChannel: String, // card, bank_transfer, ussd
    // Transfer specific
    counterpartyUserId: ObjectId,
    counterpartyName: String
  },
  providerReference: String, // AidaPay's transaction ID
  providerStatus: String,    // raw status from AidaPay
  providerResponse: Object,  // full raw response (for debugging)
  failureReason: String,
  retryCount: { type: Number, default: 0 },
  processedAt: Date,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
  { reference: 1 }               unique
  { userId: 1, createdAt: -1 }
  { status: 1, createdAt: -1 }
  { type: 1, userId: 1 }
  { providerReference: 1 }
  { "meta.phone": 1, type: 1, createdAt: -1 }  // for duplicate detection
```

---

## 4. ledger

```js
// Immutable — never update or delete entries
{
  _id: ObjectId,
  transactionId: ObjectId,   // ref: transactions
  userId: ObjectId,
  walletId: ObjectId,
  entry: {
    type: String,
    enum: ['debit', 'credit']
  },
  amount: Decimal128,        // in kobo
  balanceBefore: Decimal128,
  balanceAfter: Decimal128,
  description: String,       // human-readable e.g. "MTN Airtime ₦200 to 0812..."
  createdAt: Date            // immutable timestamp
}

Indexes:
  { walletId: 1, createdAt: -1 }
  { transactionId: 1 }
```

---

## 5. services

```js
{
  _id: ObjectId,
  serviceId: String,         // unique slug: "airtime_mtn", "data_airtel", etc.
  category: {
    type: String,
    enum: ['airtime', 'data', 'cable', 'electricity', 'exam', 'betting']
  },
  provider: String,          // "MTN", "DStv", "IKEDC", "WAEC", etc.
  name: String,              // display name
  logo: String,              // URL
  isActive: Boolean,
  basePrice: Decimal128,     // cost price from AidaPay (in kobo per unit, or % for variable)
  sellingPrice: Decimal128,  // default customer price
  discount: {                // customer default cashback
    type: String,
    enum: ['percentage', 'fixed'],
    value: Decimal128
  },
  minAmount: Decimal128,
  maxAmount: Decimal128,
  plans: [{                  // for data bundles, cable plans
    planId: String,
    name: String,
    amount: Decimal128,
    validity: String,
    providerPlanCode: String // AidaPay's internal plan code
  }],
  aidapayServiceCode: String, // AidaPay's service identifier
  updatedAt: Date
}

Indexes:
  { serviceId: 1 }  unique
  { category: 1, isActive: 1 }
```

---

## 6. agent_pricing

```js
{
  _id: ObjectId,
  agentId: ObjectId,         // ref: users
  serviceId: String,         // ref: services.serviceId
  discount: {
    type: String,
    enum: ['percentage', 'fixed'],
    value: Decimal128        // agent gets this off base price
  },
  isActive: { type: Boolean, default: true },
  setBy: ObjectId,           // ref: users (admin who set it)
  createdAt: Date,
  updatedAt: Date
}

Indexes:
  { agentId: 1, serviceId: 1 }  unique
```

---

## 7. commissions

```js
{
  _id: ObjectId,
  beneficiaryId: ObjectId,   // agent/sub-agent who earned commission
  sourceUserId: ObjectId,    // user whose transaction triggered commission
  transactionId: ObjectId,   // ref: transactions
  type: {
    type: String,
    enum: ['agent_commission', 'cashback', 'referral_bonus']
  },
  amount: Decimal128,        // in kobo
  status: {
    type: String,
    enum: ['pending', 'credited', 'cancelled'],
    default: 'pending'
  },
  creditedAt: Date,
  createdAt: Date
}

Indexes:
  { beneficiaryId: 1, createdAt: -1 }
  { transactionId: 1 }
  { status: 1 }
```

---

## 8. referrals

```js
{
  _id: ObjectId,
  referrerId: ObjectId,      // user who shared the code
  refereeId: ObjectId,       // user who signed up with the code
  referralCode: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'expired'],
    default: 'pending'
  },
  bonusAmount: Decimal128,   // in kobo
  qualifyingTransactionId: ObjectId, // first tx that triggered bonus
  completedAt: Date,
  createdAt: Date
}

Indexes:
  { referrerId: 1 }
  { refereeId: 1 }  unique
  { referralCode: 1 }
```

---

## 9. kyc_verifications

```js
{
  _id: ObjectId,
  userId: ObjectId,
  type: {
    type: String,
    enum: ['bvn', 'nin']
  },
  submittedValue: String,    // encrypted BVN/NIN
  status: {
    type: String,
    enum: ['pending', 'verified', 'failed'],
    default: 'pending'
  },
  providerReference: String, // Dojah/Smile verification ID
  verifiedData: {            // returned from provider (PII encrypted)
    firstName: String,
    lastName: String,
    dob: String,
    phone: String
  },
  failureReason: String,
  verifiedAt: Date,
  createdAt: Date
}

Indexes:
  { userId: 1, type: 1 }
  { status: 1 }
```

---

## 10. virtual_accounts

```js
{
  _id: ObjectId,
  userId: ObjectId,
  provider: { type: String, enum: ['paystack', 'flutterwave'] },
  accountNumber: String,
  accountName: String,
  bankName: String,
  bankCode: String,
  providerCustomerId: String,
  isActive: { type: Boolean, default: true },
  createdAt: Date
}

Indexes:
  { userId: 1 }
  { accountNumber: 1 }
```

---

## 11. api_keys

```js
{
  _id: ObjectId,
  userId: ObjectId,
  name: String,              // e.g. "Production Key"
  keyHash: String,           // bcrypt hash of the key (never store plaintext)
  prefix: String,            // first 8 chars shown in dashboard e.g. "pk_live_"
  environment: {
    type: String,
    enum: ['live', 'sandbox'],
    default: 'sandbox'
  },
  permissions: [String],     // ['airtime', 'data', 'cable', 'electricity']
  rateLimit: { type: Number, default: 100 }, // requests per minute
  lastUsedAt: Date,
  isActive: { type: Boolean, default: true },
  createdAt: Date
}

Indexes:
  { userId: 1 }
  { prefix: 1 }
```

---

## 12. webhooks

```js
{
  _id: ObjectId,
  userId: ObjectId,
  url: String,               // https endpoint
  events: [String],          // ['transaction.success', 'transaction.failed']
  secret: String,            // signing secret (for HMAC verification by client)
  isActive: { type: Boolean, default: true },
  deliveryLog: [{
    deliveredAt: Date,
    event: String,
    statusCode: Number,
    success: Boolean,
    attempt: Number
  }],
  createdAt: Date
}

Indexes:
  { userId: 1 }
```

---

## 13. fraud_flags

```js
{
  _id: ObjectId,
  userId: ObjectId,
  transactionId: ObjectId,
  reason: {
    type: String,
    enum: ['velocity_breach', 'duplicate_transaction', 'suspicious_pattern', 'manual_flag']
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high']
  },
  status: {
    type: String,
    enum: ['open', 'reviewed', 'dismissed', 'actioned'],
    default: 'open'
  },
  reviewedBy: ObjectId,
  reviewNote: String,
  createdAt: Date,
  reviewedAt: Date
}

Indexes:
  { userId: 1, status: 1 }
  { status: 1, severity: -1 }
  { transactionId: 1 }
```

---

## 14. audit_logs

```js
// Append-only — never update or delete
{
  _id: ObjectId,
  adminId: ObjectId,
  action: String,            // e.g. "user.suspend", "pricing.update", "transaction.refund"
  targetType: String,        // "user", "transaction", "pricing"
  targetId: ObjectId,
  before: Object,            // snapshot before change
  after: Object,             // snapshot after change
  ip: String,
  userAgent: String,
  createdAt: Date
}

Indexes:
  { adminId: 1, createdAt: -1 }
  { targetType: 1, targetId: 1 }
  { action: 1, createdAt: -1 }
```

---

## Summary: Index Strategy

- All foreign key fields (`userId`, `walletId`, etc.) are indexed.
- Compound indexes on common query patterns (userId + createdAt for transaction history).
- `transactions.reference` and `transactions.providerReference` are unique — used for idempotency.
- `ledger` and `audit_logs` are append-only; no update/delete operations should be issued against them.
- Monetary values stored in **kobo (integer)** using `Decimal128` — never use JavaScript `Number` for financial arithmetic; use a library like `big.js` or MongoDB aggregation for calculations.
