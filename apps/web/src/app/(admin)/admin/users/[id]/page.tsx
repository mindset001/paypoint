'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Mail, Shield, Clock, Wallet, AlertTriangle, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { formatNGN } from '@/lib/utils';
import type { AdminUserDetail } from '@/types';

const STATUS_BADGE: Record<string, string> = {
  active:      'bg-green-500/10 text-green-400 border-green-500/20',
  suspended:   'bg-red-500/10 text-red-400 border-red-500/20',
  pending_kyc: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const TX_STATUS_COLOR: Record<string, string> = {
  success:  'text-green-400',
  failed:   'text-red-400',
  pending:  'text-yellow-400',
  reversed: 'text-slate-400',
};

const TX_TYPE_LABEL: Record<string, string> = {
  airtime:                'Airtime',
  data:                   'Data',
  cable:                  'Cable TV',
  electricity:            'Electricity',
  exam:                   'Exam Pin',
  wallet_fund:            'Wallet Fund',
  wallet_transfer_debit:  'Transfer Out',
  wallet_transfer_credit: 'Transfer In',
  commission:             'Commission',
  cashback:               'Cashback',
  refund:                 'Refund',
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/40 last:border-0">
      <p className="text-slate-500 text-sm">{label}</p>
      <div className="text-slate-200 text-sm font-medium text-right">{value}</div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [data, setData]             = useState<AdminUserDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [err, setErr]               = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.user(id)
      .then((r) => setData(r.data.data))
      .catch((e) => setErr(e.response?.data?.message ?? 'Failed to load user'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const changeStatus = async (status: string) => {
    setActionLoading(true);
    try {
      await adminApi.updateUserStatus(id, status);
      toast.success(`User ${status === 'suspended' ? 'suspended' : status === 'active' ? 'activated' : 'updated'}`);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Action failed';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const changeRole = async (role: string) => {
    setActionLoading(true);
    try {
      await adminApi.updateUserRole(id, role);
      toast.success('Role updated');
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Action failed';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="p-8 space-y-4">
      {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-slate-800/40 rounded-2xl animate-pulse" />)}
    </div>
  );

  if (err || !data) return (
    <div className="p-8 flex items-center gap-3 text-red-400">
      <AlertTriangle size={18} />
      {err || 'User not found'}
    </div>
  );

  const { user, wallet, recentTx } = data;

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Back */}
      <button onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors group">
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Users
      </button>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-brand-blue/20 border border-brand-blue/30 flex items-center justify-center shrink-0 text-2xl font-black text-blue-400">
          {user.firstName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-xl font-black">{user.firstName} {user.lastName}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{user.referralCode} · Joined {new Date(user.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_BADGE[user.status] ?? ''}`}>
              {user.status === 'pending_kyc' ? 'Pending KYC' : user.status}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
              {user.role}
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">

        {/* Left column: user info + actions */}
        <div className="lg:col-span-2 space-y-5">

          {/* Contact info */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">Contact</p>
            <InfoRow label="Phone"
              value={
                <span className="flex items-center gap-1.5">
                  <Phone size={13} />
                  {user.phone?.number}
                  {user.phone?.verified
                    ? <CheckCircle size={13} className="text-green-400" />
                    : <XCircle size={13} className="text-red-400" />}
                </span>
              }
            />
            <InfoRow label="Email"
              value={
                <span className="flex items-center gap-1.5 max-w-[220px] truncate">
                  <Mail size={13} />
                  <span className="truncate">{user.email?.address || '—'}</span>
                  {user.email?.address && (user.email.verified
                    ? <CheckCircle size={13} className="text-green-400 shrink-0" />
                    : <XCircle size={13} className="text-red-400 shrink-0" />)}
                </span>
              }
            />
            <InfoRow label="2FA" value={user.twoFactorEnabled ? 'Enabled' : 'Disabled'} />
            <InfoRow label="Last login"
              value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-NG') : 'Never'} />
            {user.lastLoginIp && <InfoRow label="Last IP" value={<code className="text-xs">{user.lastLoginIp}</code>} />}
          </div>

          {/* Recent transactions */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Recent transactions</p>
              <a href={`/admin/transactions?userId=${user._id}`}
                className="text-blue-400 text-xs flex items-center gap-1 hover:text-blue-300 transition-colors">
                All <ChevronRight size={12} />
              </a>
            </div>

            {recentTx.length === 0 && (
              <p className="text-slate-600 text-sm px-5 pb-5">No transactions yet.</p>
            )}

            <div className="divide-y divide-slate-700/30">
              {recentTx.map((tx) => (
                <div key={tx._id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${tx.status === 'success' ? 'bg-green-500' : tx.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-medium">{TX_TYPE_LABEL[tx.type] ?? tx.type}</p>
                    <p className="text-slate-500 text-xs">{tx.reference}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${tx.direction === 'credit' ? 'text-green-400' : 'text-slate-300'}`}>
                      {tx.direction === 'credit' ? '+' : '−'}{formatNGN(tx.amount / 100)}
                    </p>
                    <p className={`text-xs ${TX_STATUS_COLOR[tx.status] ?? ''}`}>{tx.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: wallet + actions */}
        <div className="space-y-5">

          {/* Wallet */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={15} className="text-slate-400" />
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Wallet</p>
            </div>
            {wallet ? (
              <>
                <p className="text-white text-2xl font-black mb-1">{formatNGN(wallet.balance / 100)}</p>
                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{wallet.tier}</span>
                <div className="mt-4 space-y-2 pt-3 border-t border-slate-700/40">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total funded</span>
                    <span className="text-slate-200">{formatNGN(wallet.totalFunded / 100)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total spent</span>
                    <span className="text-slate-200">{formatNGN(wallet.totalSpent / 100)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Daily limit</span>
                    <span className="text-slate-200">{formatNGN(wallet.dailySpendLimit / 100)}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-slate-500 text-sm">No wallet</p>
            )}
          </div>

          {/* Actions */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-3">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Actions</p>

            {/* Status */}
            <div>
              <p className="text-slate-500 text-xs mb-1.5 flex items-center gap-1"><Shield size={12} /> Change status</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(['active', 'suspended', 'pending_kyc'] as const).map((s) => (
                  <button key={s}
                    onClick={() => changeStatus(s)}
                    disabled={actionLoading || user.status === s}
                    className={`text-xs px-2 py-1.5 rounded-lg font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed border ${
                      user.status === s
                        ? STATUS_BADGE[s]
                        : 'border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}>
                    {s === 'pending_kyc' ? 'KYC' : s}
                  </button>
                ))}
              </div>
            </div>

            {/* Role */}
            <div>
              <p className="text-slate-500 text-xs mb-1.5 flex items-center gap-1"><Clock size={12} /> Change role</p>
              <select
                value={user.role}
                onChange={(e) => changeRole(e.target.value)}
                disabled={actionLoading}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue/60 disabled:opacity-40">
                <option value="customer">Customer</option>
                <option value="agent">Agent</option>
                <option value="sub_agent">Sub-agent</option>
                <option value="admin">Admin</option>
                <option value="developer">Developer</option>
              </select>
            </div>

            {/* KYC verify shortcut */}
            {user.status === 'pending_kyc' && (
              <button
                onClick={() => changeStatus('active')}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-40">
                <CheckCircle size={15} />
                Verify &amp; Activate
              </button>
            )}

            {user.status === 'active' && (
              <button
                onClick={() => changeStatus('suspended')}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-40">
                <XCircle size={15} />
                Suspend Account
              </button>
            )}

            {user.status === 'suspended' && (
              <button
                onClick={() => changeStatus('active')}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-40">
                <CheckCircle size={15} />
                Re-activate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
