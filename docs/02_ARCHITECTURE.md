# System Architecture
## PayPoint — Nigerian VTU & Bill Payment Platform

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  React Native│  │  Next.js Web │  │  Third-party Developer   │  │
│  │  Mobile App  │  │  (Customer + │  │  (REST API + Webhooks)   │  │
│  │  (iOS/Android│  │  Agent +     │  │                          │  │
│  │              │  │  Admin UI)   │  │                          │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘  │
└─────────┼─────────────────┼──────────────────────┼─────────────────┘
          │                 │                       │
          └─────────────────┴───────────────────────┘
                            │ HTTPS / REST + JWT
┌───────────────────────────▼─────────────────────────────────────────┐
│                        API GATEWAY / NGINX                          │
│            (Rate limiting, TLS termination, routing)                │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                      EXPRESS API SERVER                             │
│                    (Node.js — Stateless)                            │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Auth    │ │  Wallet  │ │   VTU    │ │  Agent   │ │  Admin   │  │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │ │  Module  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       │             │            │             │            │        │
│  ┌────▼─────────────▼────────────▼─────────────▼────────────▼─────┐  │
│  │              SERVICE LAYER (Business Logic)                     │  │
│  │  WalletService | TransactionService | CommissionService         │  │
│  │  NotificationService | FraudService | LedgerService             │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
          ┌────────────────────────┼──────────────────────────┐
          │                        │                          │
┌─────────▼──────┐      ┌──────────▼───────┐      ┌──────────▼───────┐
│   MongoDB      │      │  Redis (Cache +  │      │  Bull Queue      │
│   (Primary DB) │      │  Sessions +      │      │  (Async Jobs:    │
│                │      │  Rate Limits)    │      │  notifications,  │
│                │      │                  │      │  webhooks,       │
│                │      │                  │      │  commissions)    │
└────────────────┘      └──────────────────┘      └──────────────────┘
          │
          │  External Integrations
┌─────────▼──────────────────────────────────────────────────────────┐
│                    THIRD-PARTY SERVICES                            │
│  ┌────────────┐ ┌───────────┐ ┌──────────┐ ┌─────────────────────┐ │
│  │ AidaPay API│ │ Paystack  │ │  Termii  │ │  Dojah (KYC)        │ │
│  │ (VTU core) │ │(Payments) │ │  (SMS)   │ │                     │ │
│  └────────────┘ └───────────┘ └──────────┘ └─────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Module Breakdown

### 2.1 Auth Module
```
POST /api/v1/auth/register          — email/phone + password
POST /api/v1/auth/verify-otp        — OTP from SMS/email
POST /api/v1/auth/login             — returns access + refresh token
POST /api/v1/auth/refresh           — rotate refresh token
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/set-pin           — transaction PIN
POST /api/v1/auth/verify-pin        — verify PIN before transaction
POST /api/v1/auth/kyc               — submit BVN/NIN
```

### 2.2 Wallet Module
```
GET  /api/v1/wallet                 — balance + tier
POST /api/v1/wallet/fund            — initiate card/bank funding
POST /api/v1/wallet/webhook         — Paystack/Flutterwave webhook (internal)
POST /api/v1/wallet/transfer        — wallet-to-wallet transfer
GET  /api/v1/wallet/transactions    — paginated history
GET  /api/v1/wallet/transactions/:id
```

### 2.3 VTU Module
```
GET  /api/v1/services               — list available services + pricing
POST /api/v1/airtime                — buy airtime
POST /api/v1/data                   — buy data bundle
GET  /api/v1/data/plans/:network    — available plans
POST /api/v1/cable/verify           — verify smartcard/IUC number
POST /api/v1/cable                  — subscribe/renew cable
GET  /api/v1/cable/plans/:provider
POST /api/v1/electricity/verify     — verify meter number
POST /api/v1/electricity            — pay electricity bill
POST /api/v1/exam                   — buy exam PIN
GET  /api/v1/exam/types
POST /api/v1/betting                — fund betting wallet
```

### 2.4 Agent Module
```
POST /api/v1/agent/apply            — customer applies to become agent
GET  /api/v1/agent/profile
GET  /api/v1/agent/sub-agents       — list sub-agents
GET  /api/v1/agent/commissions      — commission history
GET  /api/v1/agent/pricing          — agent's custom pricing
```

### 2.5 Admin Module
```
GET  /api/v1/admin/users
PATCH /api/v1/admin/users/:id       — suspend/activate/upgrade tier
GET  /api/v1/admin/transactions
POST /api/v1/admin/transactions/:id/refund
GET  /api/v1/admin/pricing
PATCH /api/v1/admin/pricing         — update margins
GET  /api/v1/admin/reports/revenue
GET  /api/v1/admin/reports/services
GET  /api/v1/admin/fraud/flagged
```

### 2.6 Developer API Module
```
POST /api/v1/developer/keys         — generate API key
GET  /api/v1/developer/keys
DELETE /api/v1/developer/keys/:id
GET  /api/v1/developer/webhooks
POST /api/v1/developer/webhooks     — register webhook URL
```

---

## 3. Transaction Flow (VTU Purchase)

```
Client
  │
  ├─ POST /api/v1/airtime  { network, phone, amount, pin }
  │
  ▼
Auth Middleware
  ├─ Verify JWT
  └─ Verify transaction PIN (hashed comparison)
  │
  ▼
Fraud Service
  ├─ Velocity check (too many tx in last 1h?)
  └─ Duplicate check (same params in last 60s?)
  │
  ▼
WalletService.debit(userId, amount)
  ├─ Check balance >= amount
  ├─ Begin MongoDB transaction (session)
  ├─ Deduct wallet balance
  └─ Create PENDING transaction record
  │
  ▼
AidaPay Provider
  ├─ POST to AidaPay API
  ├─ On SUCCESS → update transaction to SUCCESS, write to ledger
  └─ On FAILURE → reverse wallet debit, update transaction to FAILED
  │
  ▼
CommissionService (async via Bull queue)
  ├─ Calculate agent discount / cashback
  └─ Credit agent wallet
  │
  ▼
NotificationService (async via Bull queue)
  ├─ Send SMS receipt
  └─ Send push notification
  │
  ▼
Response to client: { status, transactionId, token (for electricity) }
```

---

## 4. Wallet Fund Flow

```
Client initiates funding
  │
  ▼
PaystackService.initializePayment({ amount, email, reference })
  │
  ▼
Client redirected to Paystack checkout
  │
  ▼
Paystack calls POST /api/v1/wallet/webhook
  ├─ Verify webhook signature (HMAC-SHA512)
  ├─ Check event = "charge.success"
  ├─ Verify reference not already processed (idempotency)
  ├─ WalletService.credit(userId, amount)
  └─ Create CREDIT transaction record
```

---

## 5. Security Architecture

| Layer | Mechanism |
|-------|-----------|
| Transport | TLS 1.3 (Nginx) |
| Authentication | JWT (RS256, 15min access / 7d refresh) |
| Transaction auth | 6-digit PIN (bcrypt hashed) |
| Webhook verification | HMAC-SHA512 (Paystack), signature check (AidaPay) |
| Rate limiting | Redis sliding window — 100 req/min per IP, 20 tx/hr per user |
| Sensitive data | BVN/NIN encrypted at rest (AES-256-GCM) |
| Idempotency | Transaction reference stored; duplicate webhooks rejected |
| Audit | Immutable ledger collection, no updates/deletes allowed |

---

## 6. Directory Structure

```
paypoint/
├── apps/
│   ├── api/                        # Express backend
│   │   ├── src/
│   │   │   ├── config/             # env, db, redis
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── wallet/
│   │   │   │   ├── vtu/
│   │   │   │   │   ├── airtime/
│   │   │   │   │   ├── data/
│   │   │   │   │   ├── cable/
│   │   │   │   │   ├── electricity/
│   │   │   │   │   ├── exam/
│   │   │   │   │   └── betting/
│   │   │   │   ├── agent/
│   │   │   │   ├── admin/
│   │   │   │   └── developer/
│   │   │   ├── providers/
│   │   │   │   ├── aidapay/        # AidaPay API client
│   │   │   │   └── paystack/       # Paystack client
│   │   │   ├── services/
│   │   │   │   ├── wallet.service.js
│   │   │   │   ├── commission.service.js
│   │   │   │   ├── fraud.service.js
│   │   │   │   ├── ledger.service.js
│   │   │   │   └── notification.service.js
│   │   │   ├── queues/             # Bull job queues
│   │   │   ├── middlewares/
│   │   │   ├── models/             # Mongoose models
│   │   │   └── utils/
│   │   └── tests/
│   ├── web/                        # Next.js dashboard
│   └── mobile/                     # React Native app
├── docs/
│   ├── 01_BRD.md
│   ├── 02_ARCHITECTURE.md
│   └── 03_DATABASE.md
└── docker-compose.yml
```

---

## 7. Infrastructure (Production)

| Component | Recommended Service |
|-----------|---------------------|
| API Server | Railway / Render / DigitalOcean App Platform |
| MongoDB | MongoDB Atlas (M10+) |
| Redis | Upstash Redis / Redis Cloud |
| File storage | Cloudinary / AWS S3 |
| Email | Resend / SendGrid |
| SMS | Termii (Nigerian provider) |
| Push notifications | Firebase Cloud Messaging |
| Monitoring | Sentry (errors) + Grafana/Datadog (metrics) |
| CI/CD | GitHub Actions |
