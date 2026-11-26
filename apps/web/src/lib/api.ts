import axios, { AxiosError } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refreshToken');
        if (refresh) {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: refresh });
          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          original.headers!.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        }
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { firstName: string; lastName: string; email: string; phone: string; password: string; referralCode?: string }) =>
    api.post('/auth/register', data),
  verifyOtp: (identifier: string, otp: string) =>
    api.post('/auth/verify-otp', { identifier, otp }),
  resendOtp: (identifier: string) =>
    api.post('/auth/resend-otp', { identifier }),
  login: (identifier: string, password: string) =>
    api.post('/auth/login', { identifier, password }),
  google: (idToken: string) =>
    api.post('/auth/google', { idToken }),
  addPhone: (phone: string) =>
    api.post('/auth/add-phone', { phone }),
  setPin: (pin: string, confirmPin: string) =>
    api.post('/auth/set-pin', { pin, confirmPin }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// ── Wallet ───────────────────────────────────────────────────────────
export const walletApi = {
  get: () => api.get('/wallet'),
  fund: (amount: number, provider: 'paystack' | 'flutterwave' | 'monnify' = 'paystack') =>
    api.post('/wallet/fund', { amount, provider }),
  verifyPayment: (provider: string, reference: string, transactionId?: string) =>
    api.post('/wallet/fund/verify', { provider, reference, transactionId }),
  virtualAccount: () =>
    api.get('/wallet/virtual-account'),
  transfer: (recipient: string, amount: number, pin: string) =>
    api.post('/wallet/transfer', { recipient, amount, pin }),
  verifyRecipient: (recipient: string) =>
    api.post('/wallet/transfer/verify', { recipient }),
  recentRecipients: () =>
    api.get('/wallet/transfer/recent'),
  transactions: (params?: { page?: number; limit?: number; type?: string; status?: string; from?: string; to?: string }) =>
    api.get('/wallet/transactions', { params }),
  transactionByReference: (reference: string) =>
    api.get(`/wallet/transactions/${encodeURIComponent(reference)}`),
};

// ── Services ─────────────────────────────────────────────────────────
export const servicesApi = {
  list: () => api.get('/services'),
  features: () => api.get('/services/features'),
};

// ── Airtime ──────────────────────────────────────────────────────────
export const airtimeApi = {
  buy: (network: string, phone: string, amount: number, pin: string) =>
    api.post('/airtime', { network, phone, amount, pin }),
};

// ── Data ─────────────────────────────────────────────────────────────
export const dataApi = {
  catalogs: (network: string) => api.get(`/data/catalogs/${network}`),
  plans: (network: string, catalog?: string) =>
    api.get(`/data/plans/${network}`, { params: catalog ? { catalog } : undefined }),
  buy: (network: string, catalog: string | undefined, phone: string, planId: string, amount: number, pin: string) =>
    api.post('/data', { network, catalog, phone, planId, amount, pin }),
};

// ── Cable ────────────────────────────────────────────────────────────
export const cableApi = {
  plans: (provider: string) => api.get(`/cable/plans/${provider}`),
  verify: (provider: string, smartcardNumber: string) =>
    api.post('/cable/verify', { provider, smartcardNumber }),
  subscribe: (provider: string, smartcardNumber: string, planCode: string, amount: number, pin: string) =>
    api.post('/cable', { provider, smartcardNumber, planCode, amount, pin }),
};

// ── Electricity ──────────────────────────────────────────────────────
export const electricityApi = {
  verify: (disco: string, meterNumber: string, meterType: string) =>
    api.post('/electricity/verify', { disco, meterNumber, meterType }),
  pay: (disco: string, meterNumber: string, meterType: string, amount: number, phone: string, pin: string) =>
    api.post('/electricity', { disco, meterNumber, meterType, amount, phone, pin }),
};

// ── Profile & KYC ────────────────────────────────────────────────────
export const profileApi = {
  update: (data: { firstName: string; lastName: string }) =>
    api.patch('/auth/profile', data),
  submitKyc: (data: { nin?: string; bvn?: string }) =>
    api.post('/auth/kyc', data),
};

// ── Password / PIN ───────────────────────────────────────────────────
export const securityApi = {
  forgotPassword: (identifier: string) =>
    api.post('/auth/forgot-password', { identifier }),
  resetPassword: (identifier: string, otp: string, newPassword: string) =>
    api.post('/auth/reset-password', { identifier, otp, newPassword }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/auth/change-password', { currentPassword, newPassword }),
  confirmChangePassword: (otp: string) =>
    api.post('/auth/change-password/confirm', { otp }),
  changePin: (currentPin: string, newPin: string) =>
    api.patch('/auth/change-pin', { currentPin, newPin }),
  confirmChangePin: (otp: string) =>
    api.post('/auth/change-pin/confirm', { otp }),
  forgotPin: () => api.post('/auth/forgot-pin'),
  resetPin: (otp: string, newPin: string) =>
    api.post('/auth/reset-pin', { otp, newPin }),
};

// ── Notifications ─────────────────────────────────────────────────────
export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; unread?: boolean }) =>
    api.get('/notifications', { params }),
  unreadCount: () =>
    api.get('/notifications/unread-count'),
  markRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),
  markAllRead: () =>
    api.patch('/notifications/read-all'),
  popups: () =>
    api.get('/notifications/popups'),
};

// ── Referral ─────────────────────────────────────────────────────────
export const referralApi = {
  stats: () => api.get('/referral/stats'),
  history: (params?: { page?: number; limit?: number }) =>
    api.get('/referral/history', { params }),
  signupBonus: () => api.get('/referral/signup-bonus'),
};

// ── Admin ─────────────────────────────────────────────────────────────
export const adminApi = {
  stats: () =>
    api.get('/admin/stats'),
  users: (params?: { page?: number; limit?: number; search?: string; role?: string; status?: string }) =>
    api.get('/admin/users', { params }),
  user: (id: string) =>
    api.get(`/admin/users/${id}`),
  updateUserStatus: (id: string, status: string) =>
    api.patch(`/admin/users/${id}/status`, { status }),
  updateUserRole: (id: string, role: string) =>
    api.patch(`/admin/users/${id}/role`, { role }),
  userTransactions: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/admin/users/${id}/transactions`, { params }),
  transactions: (params?: { page?: number; limit?: number; type?: string; status?: string; userId?: string; from?: string; to?: string }) =>
    api.get('/admin/transactions', { params }),
  getReferralBonusSettings: () =>
    api.get('/admin/settings/referral-bonus'),
  updateReferralBonusSettings: (data: { basic: number; standard: number; premium: number }) =>
    api.patch('/admin/settings/referral-bonus', data),
  getSignupBonusSettings: () =>
    api.get('/admin/settings/signup-bonus'),
  updateSignupBonusSettings: (amount: number) =>
    api.patch('/admin/settings/signup-bonus', { amount }),
  getCashbackSettings: () =>
    api.get('/admin/settings/cashback'),
  updateCashbackSettings: (data: { customer: number; agent: number }) =>
    api.patch('/admin/settings/cashback', data),
  getFeatureFlags: () =>
    api.get('/admin/settings/features'),
  updateFeatureFlags: (data: Partial<Record<
    'exam' | 'reseller' | 'savings' | 'withdrawal' | 'paystack' | 'flutterwave' | 'monnify' | 'kyc_bvn' | 'kyc_nin' | 'kyc_number',
    'live' | 'coming_soon' | 'hidden'
  >>) =>
    api.patch('/admin/settings/features', data),
  stuckDeposits: () =>
    api.get('/admin/deposits/stuck'),
  reconcileDeposit: (id: string, transactionId?: string) =>
    api.post(`/admin/deposits/${id}/reconcile`, transactionId ? { transactionId } : {}),
  pendingWithdrawals: () =>
    api.get('/admin/withdrawals/pending'),
  reconcileWithdrawal: (id: string) =>
    api.post(`/admin/withdrawals/${id}/reconcile`),
  ledger: (params?: { page?: number; limit?: number; userId?: string; search?: string }) =>
    api.get('/admin/ledger', { params }),
  pendingKyc: () =>
    api.get('/admin/kyc/pending'),
  approveKyc: (id: string) =>
    api.post(`/admin/kyc/${id}/approve`),
  rejectKyc: (id: string, reason: string) =>
    api.post(`/admin/kyc/${id}/reject`, { reason }),
  savingsLocks: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/admin/savings', { params }),
  auditLog: (params?: { page?: number; limit?: number; adminId?: string; targetUserId?: string; action?: string }) =>
    api.get('/admin/audit-log', { params }),
  chartData: () =>
    api.get('/admin/stats/charts'),
  aidapayOverview: () =>
    api.get('/admin/aidapay/overview'),
  dataPlans: () =>
    api.get('/admin/data-plans'),
  setDataPlanPrice: (planId: string, data: { customer: number; agent: number }) =>
    api.patch(`/admin/data-plans/${encodeURIComponent(planId)}`, data),
  removeDataPlanPrice: (planId: string) =>
    api.delete(`/admin/data-plans/${encodeURIComponent(planId)}`),
  examPlans: () =>
    api.get('/admin/exam-plans'),
  setExamPlanPrice: (planId: string, data: { customer: number; agent: number }) =>
    api.patch(`/admin/exam-plans/${encodeURIComponent(planId)}`, data),
  removeExamPlanPrice: (planId: string) =>
    api.delete(`/admin/exam-plans/${encodeURIComponent(planId)}`),
  exportTransactionsCsv: (params?: { type?: string; status?: string; userId?: string; from?: string; to?: string }) =>
    api.get('/admin/transactions/export', { params, responseType: 'blob' }),
  exportUsersCsv: (params?: { search?: string; role?: string; status?: string }) =>
    api.get('/admin/users/export', { params, responseType: 'blob' }),
  announcements: (params?: { page?: number; limit?: number }) =>
    api.get('/admin/announcements', { params }),
  sendAnnouncement: (data: { title: string; body: string; displayType: 'notification' | 'popup' }) =>
    api.post('/admin/announcements', data),
};

// ── Exam ─────────────────────────────────────────────────────────────
export const examApi = {
  plans: () => api.get('/exam/plans'),
  buy: (planId: string, quantity: number, pin: string) =>
    api.post('/exam', { planId, quantity, pin }),
};

// ── VTU shared ───────────────────────────────────────────────────────
export const vtuApi = {
  recentNumbers: () => api.get('/vtu/numbers'),
};

// ── Savings ──────────────────────────────────────────────────────────
export const savingsApi = {
  list: () => api.get('/savings'),
  create: (name: string, amount: number, durationDays: number, pin: string) =>
    api.post('/savings', { name, amount, durationDays, pin }),
  withdraw: (id: string) => api.post(`/savings/${id}/withdraw`),
  topUp: (id: string, amount: number, pin: string) =>
    api.post(`/savings/${id}/topup`, { amount, pin }),
};

// ── Bank Withdrawal ──────────────────────────────────────────────────
export const withdrawApi = {
  banks: () => api.get('/withdraw/banks'),
  verifyAccount: (bankCode: string, accountNumber: string) =>
    api.post('/withdraw/verify-account', { bankCode, accountNumber }),
  listAccounts: () => api.get('/withdraw/accounts'),
  addAccount: (bankCode: string, bankName: string, accountNumber: string) =>
    api.post('/withdraw/accounts', { bankCode, bankName, accountNumber }),
  deleteAccount: (id: string) => api.delete(`/withdraw/accounts/${id}`),
  withdraw: (bankAccountId: string, amount: number, pin: string) =>
    api.post('/withdraw', { bankAccountId, amount, pin }),
};

