# Business Requirements Document (BRD)
## PayPoint — Nigerian VTU & Bill Payment Platform
**Version:** 1.0  
**Date:** 2026-06-13  
**Stack:** Node.js + Express + MongoDB | Next.js | React Native | AidaPay API

---

## 1. Executive Summary

PayPoint is a B2C and B2B Virtual Top-Up (VTU) and bill payment platform targeting Nigerian consumers, agents, and resellers. It aggregates airtime, data, cable TV, electricity, exam pins, and other utility payments into a single wallet-powered interface — with a white-label reseller tier for sub-agents and an open API for third-party developers.

---

## 2. Stakeholders

| Role | Description |
|------|-------------|
| **Customer** | End user buying airtime, data, bills via web or mobile app |
| **Agent/Reseller** | Business that buys at discounted rates and resells to customers |
| **Sub-Agent** | Agent recruited by a top-level agent; earns from own sales |
| **Admin** | Platform operator managing users, pricing, fraud, and reports |
| **API Developer** | Third-party developer integrating PayPoint services into their app |

---

## 3. Functional Requirements

### 3.1 Authentication & Identity
- Email/phone registration with OTP verification
- JWT-based session management (access + refresh tokens)
- Role-based access control (RBAC): customer, agent, sub_agent, admin, developer
- BVN/NIN KYC verification (via third-party)
- PIN setup for transaction authorization
- 2FA (TOTP / SMS OTP)

### 3.2 Wallet System
- Single NGN wallet per user
- Fund wallet via: Paystack/Flutterwave card payment, bank transfer (virtual account), USSD
- Debit wallet on every transaction
- Credit wallet on: refunds, cashback, referral bonus, commission
- Transaction history with filters (date, type, status)
- Wallet-to-wallet transfer between PayPoint users
- Daily/weekly spend limits per user tier

### 3.3 VTU Services (via AidaPay API)
| Service | Details |
|---------|---------|
| Airtime | MTN, Airtel, Glo, 9mobile |
| Data bundles | MTN, Airtel, Glo, 9mobile (SME, corporate, gifting) |
| Cable TV | DStv, GOtv, Startimes — subscription renewal & addon |
| Electricity | All DisCos — IKEDC, EKEDC, AEDC, KAEDC, JED, PHEDC, etc. |
| Exam Pins | WAEC, NECO, NABTEB result checker PINs |
| JAMB | JAMB e-PIN, profile creation |
| Betting | Bet9ja, Sportybet, 1xBet — wallet funding |
| Internet | Spectranet, Smile |

### 3.4 Agent & Reseller System
- Agent registration with KYC
- Custom pricing per agent (percentage or fixed discount off base price)
- Agent wallet with auto-debit on transactions
- Sub-agent creation and management
- Commission engine: agent earns % on sub-agent transactions
- Upgrade path: customer → agent (triggered by KYC + deposit)

### 3.5 Commission & Cashback Engine
- Admin sets base price and agent discount per service
- Cashback for customers on configured services
- Commission for agents when sub-agents transact
- Referral bonus: one-time credit on referred user's first successful transaction
- All commission/cashback events logged to ledger

### 3.6 Referral System
- Each user has a unique referral code
- Referee must complete first transaction to unlock bonus
- Admin configures referral bonus amount per user tier

### 3.7 Virtual Accounts
- Each registered user optionally assigned a dedicated virtual bank account (via Paystack or Flutterwave)
- Deposits to virtual account auto-credit wallet

### 3.8 Bulk Operations
- Bulk airtime/data purchase (CSV upload or JSON payload)
- Bulk SMS (admin and agents)

### 3.9 Notifications
- In-app notifications
- Email notifications (transaction receipts, KYC status, low balance)
- SMS notifications (transaction OTP, success/failure)
- Push notifications (mobile app)

### 3.10 Developer API
- REST API with API key authentication
- Rate limiting per API key
- Sandbox environment
- Webhook delivery for async events (transaction status, balance updates)
- API key management dashboard

### 3.11 Admin Dashboard
- User management (view, suspend, upgrade tier, reset PIN)
- Transaction management (view, flag, refund)
- Pricing management (set margins per service per tier)
- Commission and cashback configuration
- Fraud monitoring (velocity checks, flagged transactions)
- Financial reports (revenue, margins, service breakdown)
- Audit logs

### 3.12 Fraud & Risk
- Velocity rules: max N transactions per hour per user
- Duplicate detection: same network + number + amount within 60s
- Suspicious account flagging
- Manual review queue for high-value transactions
- IP and device fingerprinting

---

## 4. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Availability | 99.5% uptime |
| Transaction latency | < 5s for VTU delivery (AidaPay SLA dependent) |
| API response time | < 300ms for wallet/auth endpoints |
| Concurrency | Support 500 concurrent transactions |
| Data retention | 7 years (CBN compliance) |
| Encryption | TLS 1.3 in transit, AES-256 at rest for sensitive fields |
| Audit trail | Immutable ledger for all financial events |

---

## 5. Integrations

| Integration | Purpose |
|-------------|---------|
| AidaPay API | Airtime, data, cable, electricity, exam, betting |
| Paystack | Card payments, virtual accounts, bank transfer |
| Flutterwave | Fallback payment processor |
| Termii / Africa's Talking | SMS OTP & notifications |
| Dojah / Smile Identity | BVN/NIN KYC verification |
| Firebase / OneSignal | Push notifications |

---

## 6. Compliance
- CBN agent banking guidelines
- NDPR data privacy compliance
- PCI-DSS awareness for card data (Paystack/Flutterwave handle PAN — we store no card data)
- Financial transaction audit trail for 7 years

---

## 7. Out of Scope (v1.0)
- Crypto payments
- Loan/BNPL features
- International money transfer
- Multi-currency wallets
- POS terminal management
