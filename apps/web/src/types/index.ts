export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: { address: string; verified: boolean };
  phone: { number: string; verified: boolean };
  role: 'customer' | 'agent' | 'sub_agent' | 'admin' | 'developer';
  status: 'active' | 'suspended' | 'pending_kyc';
  referralCode: string;
  kycSubmittedAt: string | null;
}

export interface Wallet {
  _id: string;
  userId: string;
  balance: number;       // in kobo
  balanceNGN: number;    // in NGN
  currency: string;
  tier: 'basic' | 'standard' | 'premium';
  dailySpendLimit: number;
  totalFunded: number;
  totalSpent: number;
}

export interface Transaction {
  _id: string;
  reference: string;
  type: string;
  direction: 'debit' | 'credit';
  amount: number;        // in kobo
  status: 'pending' | 'success' | 'failed' | 'reversed';
  balanceBefore: number;
  balanceAfter: number;
  meta: Record<string, string | undefined>;
  failureReason?: string;
  createdAt: string;
  processedAt?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface Notification {
  _id: string;
  title: string;
  body: string;
  type: 'transaction' | 'security' | 'promo' | 'system' | 'wallet';
  read: boolean;
  readAt?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

// ── Admin ─────────────────────────────────────────────────────────────
export interface AdminUserRow {
  _id: string;
  firstName: string;
  lastName: string;
  email: { address: string; verified: boolean };
  phone: { number: string; verified: boolean };
  role: User['role'];
  status: User['status'];
  referralCode: string;
  createdAt: string;
  lastLoginAt?: string;
  wallet: { balance: number; tier: string } | null;
}

export interface AdminUserDetail {
  user: AdminUserRow & { twoFactorEnabled: boolean; lastLoginIp?: string };
  wallet: Wallet | null;
  recentTx: Transaction[];
}

export interface AdminStats {
  users: { total: number; active: number; suspended: number; pendingKyc: number };
  transactions: {
    allTime: { success: number; failed: number; pending: number; volume: number; margin: number };
    today:  { count: number; volume: number; margin: number };
    week:   { count: number; volume: number; margin: number };
    month:  { count: number; volume: number; margin: number };
  };
  recentUsers: AdminUserRow[];
}

export interface AidapayOverview {
  name: string | null;
  email: string | null;
  phone: string | null;
  balance: number;
  commissionBalance: number;
  lowBalanceThreshold: number;
}

export interface AdminTransactionRow extends Transaction {
  userId?: { _id: string; firstName: string; lastName: string; phone: { number: string } };
}

export interface AdminLedgerEntry {
  _id: string;
  transactionId?: { _id: string; reference: string; type: string; status: string };
  userId?: { _id: string; firstName: string; lastName: string; phone: { number: string } };
  walletId: string;
  entry: 'debit' | 'credit';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface AdminKycRow {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  submittedAt: string;
  verifiedName?: string;
  idType: 'NIN' | 'BVN' | null;
  idLast4: string;
  priorRejectionReason?: string;
}

export interface AdminSavingsLockRow {
  _id: string;
  name: string;
  amount: number;
  status: 'active' | 'withdrawn';
  startDate: string;
  maturityDate: string;
  withdrawnAt?: string;
  userId?: { _id: string; firstName: string; lastName: string; email: { address: string }; phone: { number: string } };
}

export interface AdminAuditLogEntry {
  _id: string;
  adminId?: { _id: string; firstName: string; lastName: string; email: { address: string } };
  action: string;
  targetUserId?: { _id: string; firstName: string; lastName: string; email: { address: string } };
  targetTransactionId?: { _id: string; reference: string; type: string };
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  ip?: string;
  createdAt: string;
}

export interface AdminChartData {
  dailyVolume: { date: string; success: number; failed: number; pending: number; volume: number }[];
  providerBreakdown: { provider: string; count: number; volume: number }[];
  dailyActiveUsers: { date: string; count: number }[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type Network = 'MTN' | 'Airtel' | 'Glo' | '9mobile';
export type CableProvider = 'DSTV' | 'GOTV' | 'STARTIMES';
export type Disco = 'IKEDC' | 'EKEDC' | 'AEDC' | 'KAEDC' | 'JED' | 'PHEDC' | 'KEDCO' | 'BEDC';
