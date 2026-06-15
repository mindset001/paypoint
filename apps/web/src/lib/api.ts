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
  transactions: (params?: { page?: number; limit?: number; type?: string; status?: string }) =>
    api.get('/wallet/transactions', { params }),
};

// ── Services ─────────────────────────────────────────────────────────
export const servicesApi = {
  list: () => api.get('/services'),
};

// ── Airtime ──────────────────────────────────────────────────────────
export const airtimeApi = {
  buy: (network: string, phone: string, amount: number, pin: string) =>
    api.post('/airtime', { network, phone, amount, pin }),
};

// ── Data ─────────────────────────────────────────────────────────────
export const dataApi = {
  plans: (network: string) => api.get(`/data/plans/${network}`),
  buy: (network: string, phone: string, planId: string, amount: number, pin: string) =>
    api.post('/data', { network, phone, planId, amount, pin }),
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

// ── Password / PIN ───────────────────────────────────────────────────
export const securityApi = {
  forgotPassword: (identifier: string) =>
    api.post('/auth/forgot-password', { identifier }),
  resetPassword: (identifier: string, otp: string, newPassword: string) =>
    api.post('/auth/reset-password', { identifier, otp, newPassword }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/auth/change-password', { currentPassword, newPassword }),
  changePin: (currentPin: string, newPin: string) =>
    api.patch('/auth/change-pin', { currentPin, newPin }),
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
};

// ── Exam ─────────────────────────────────────────────────────────────
export const examApi = {
  types: () => api.get('/exam/types'),
  buy: (examType: string, quantity: number, amount: number, pin: string) =>
    api.post('/exam', { examType, quantity, amount, pin }),
};

