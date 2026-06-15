'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, ArrowLeftRight, TrendingUp, AlertTriangle, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatNGN } from '@/lib/utils';
import type { AdminStats } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  active:      'bg-green-500/10 text-green-400 border-green-500/20',
  suspended:   'bg-red-500/10 text-red-400 border-red-500/20',
  pending_kyc: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const ROLE_COLORS: Record<string, string> = {
  admin:     'bg-purple-500/10 text-purple-400',
  developer: 'bg-blue-500/10 text-blue-400',
  agent:     'bg-cyan-500/10 text-cyan-400',
  customer:  'bg-slate-500/10 text-slate-400',
};

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-slate-400 text-sm">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={17} />
        </div>
      </div>
      <p className="text-white text-2xl font-black">{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    adminApi.stats()
      .then((r) => setStats(r.data.data))
      .catch((e) => setErr(e.response?.data?.message ?? 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8 space-y-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-24 bg-slate-800/40 rounded-2xl animate-pulse" />
      ))}
    </div>
  );

  if (err) return (
    <div className="p-8 flex items-center gap-3 text-red-400">
      <AlertTriangle size={18} />
      {err}
    </div>
  );

  if (!stats) return null;
  const { users, transactions } = stats;

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-white text-2xl font-black">Overview</h1>
        <p className="text-slate-400 text-sm mt-1">Platform health at a glance</p>
      </div>

      {/* User stats */}
      <section className="mb-8">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">Users</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users"   value={users.total}      icon={Users}         color="bg-blue-500/20 text-blue-400" />
          <StatCard label="Active"        value={users.active}     icon={CheckCircle}   color="bg-green-500/20 text-green-400" />
          <StatCard label="Suspended"     value={users.suspended}  icon={XCircle}       color="bg-red-500/20 text-red-400" />
          <StatCard label="Pending KYC"   value={users.pendingKyc} icon={Clock}         color="bg-yellow-500/20 text-yellow-400" />
        </div>
      </section>

      {/* Transaction stats */}
      <section className="mb-8">
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">Transactions</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="All-time volume"
            value={formatNGN(transactions.allTime.volume / 100)}
            sub={`${transactions.allTime.success.toLocaleString()} successful`}
            icon={TrendingUp}
            color="bg-emerald-500/20 text-emerald-400"
          />
          <StatCard
            label="Today"
            value={formatNGN(transactions.today.volume / 100)}
            sub={`${transactions.today.count} txns`}
            icon={ArrowLeftRight}
            color="bg-brand-blue/20 text-blue-400"
          />
          <StatCard
            label="This week"
            value={formatNGN(transactions.week.volume / 100)}
            sub={`${transactions.week.count} txns`}
            icon={ArrowLeftRight}
            color="bg-indigo-500/20 text-indigo-400"
          />
          <StatCard
            label="This month"
            value={formatNGN(transactions.month.volume / 100)}
            sub={`${transactions.month.count} txns`}
            icon={ArrowLeftRight}
            color="bg-purple-500/20 text-purple-400"
          />
        </div>

        {/* Failed indicator */}
        {transactions.allTime.failed > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
            <AlertTriangle size={15} className="text-red-400 shrink-0" />
            <p className="text-red-300 text-sm">
              <span className="font-bold">{transactions.allTime.failed}</span> failed transactions — <Link href="/admin/transactions?status=failed" className="underline">review now</Link>
            </p>
          </div>
        )}
      </section>

      {/* Recent sign-ups */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Recent sign-ups</p>
          <Link href="/admin/users" className="text-blue-400 text-xs flex items-center gap-1 hover:text-blue-300 transition-colors">
            View all <ChevronRight size={13} />
          </Link>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl divide-y divide-slate-700/30">
          {stats.recentUsers.length === 0 && (
            <p className="text-slate-500 text-sm p-5">No users yet.</p>
          )}
          {stats.recentUsers.map((u) => (
            <Link key={u._id} href={`/admin/users/${u._id}`}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-700/30 transition-colors group">
              <div className="w-9 h-9 rounded-full bg-brand-blue/20 border border-brand-blue/30 flex items-center justify-center shrink-0">
                <span className="text-blue-400 text-sm font-bold">{u.firstName[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{u.firstName} {u.lastName}</p>
                <p className="text-slate-500 text-xs truncate">{u.phone?.number}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[u.status] ?? ''}`}>
                  {u.status === 'pending_kyc' ? 'KYC' : u.status}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] ?? ''}`}>
                  {u.role}
                </span>
                <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
