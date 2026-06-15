export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: { address: string; verified: boolean };
  phone: { number: string; verified: boolean };
  role: 'customer' | 'agent' | 'sub_agent' | 'admin' | 'developer';
  status: 'active' | 'suspended' | 'pending_kyc';
  referralCode: string;
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
  meta?: Record<string, string>;
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
    allTime: { success: number; failed: number; pending: number; volume: number };
    today:  { count: number; volume: number };
    week:   { count: number; volume: number };
    month:  { count: number; volume: number };
  };
  recentUsers: AdminUserRow[];
}

export interface AdminTransactionRow extends Transaction {
  userId?: { _id: string; firstName: string; lastName: string; phone: { number: string } };
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
