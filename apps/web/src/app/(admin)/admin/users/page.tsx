'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, ChevronLeft, AlertTriangle, Users, RefreshCw } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatNGN } from '@/lib/utils';
import type { AdminUserRow } from '@/types';

const STATUS_BADGE: Record<string, string> = {
  active:      'bg-green-500/10 text-green-400 border-green-500/20',
  suspended:   'bg-red-500/10 text-red-400 border-red-500/20',
  pending_kyc: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const ROLE_BADGE: Record<string, string> = {
  admin:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
  developer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  agent:     'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  sub_agent: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  customer:  'bg-slate-600/10 text-slate-400 border-slate-600/20',
};

export default function AdminUsersPage() {
  const [users, setUsers]   = useState<AdminUserRow[]>([]);
  const [total, setTotal]   = useState(0);
  const [pages, setPages]   = useState(1);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole]     = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr]       = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    adminApi.users({ page, limit: 20, search, role, status })
      .then((r) => {
        setUsers(r.data.data.users);
        setTotal(r.data.data.total);
        setPages(r.data.data.pages);
      })
      .catch((e) => setErr(e.response?.data?.message ?? 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [page, search, role, status]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, role, status]);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-black">Users</h1>
          <p className="text-slate-400 text-sm mt-0.5">{total.toLocaleString()} total</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search name, phone, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue/60 transition-colors"
          />
        </div>

        <select value={role} onChange={(e) => setRole(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-blue/60 transition-colors">
          <option value="">All roles</option>
          <option value="customer">Customer</option>
          <option value="agent">Agent</option>
          <option value="sub_agent">Sub-agent</option>
          <option value="admin">Admin</option>
          <option value="developer">Developer</option>
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-blue/60 transition-colors">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending_kyc">Pending KYC</option>
        </select>
      </div>

      {/* Error */}
      {err && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 text-sm">
          <AlertTriangle size={15} />
          {err}
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        {/* Header row */}
        <div className="hidden lg:grid grid-cols-[1fr_1fr_100px_110px_110px_80px_40px] gap-4 px-5 py-3 border-b border-slate-700/50">
          {['User', 'Contact', 'Role', 'Status', 'Wallet', 'Joined', ''].map((h) => (
            <p key={h} className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{h}</p>
          ))}
        </div>

        {loading && (
          <div className="divide-y divide-slate-700/30">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-700 rounded w-36" />
                  <div className="h-3 bg-slate-700/60 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users size={36} className="text-slate-600 mb-3" />
            <p className="text-slate-400 font-semibold">No users found</p>
            <p className="text-slate-600 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}

        {!loading && users.map((u) => (
          <Link key={u._id} href={`/admin/users/${u._id}`}
            className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_100px_110px_110px_80px_40px] gap-2 lg:gap-4 items-center px-5 py-4 border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors group cursor-pointer">

            {/* User */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-blue/20 border border-brand-blue/30 flex items-center justify-center shrink-0">
                <span className="text-blue-400 font-bold text-sm">{u.firstName[0]}</span>
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{u.firstName} {u.lastName}</p>
                <p className="text-slate-500 text-xs truncate">{u.referralCode}</p>
              </div>
            </div>

            {/* Contact */}
            <div className="lg:block">
              <p className="text-slate-300 text-sm">{u.phone?.number}</p>
              <p className="text-slate-500 text-xs truncate">{u.email?.address}</p>
            </div>

            {/* Role */}
            <div>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ROLE_BADGE[u.role] ?? ''}`}>
                {u.role}
              </span>
            </div>

            {/* Status */}
            <div>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_BADGE[u.status] ?? ''}`}>
                {u.status === 'pending_kyc' ? 'Pending KYC' : u.status}
              </span>
            </div>

            {/* Wallet */}
            <div>
              <p className="text-slate-300 text-sm">
                {u.wallet ? formatNGN(u.wallet.balance / 100) : '—'}
              </p>
              {u.wallet && <p className="text-slate-600 text-xs">{u.wallet.tier}</p>}
            </div>

            {/* Joined */}
            <div>
              <p className="text-slate-500 text-xs">{new Date(u.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: '2-digit' })}</p>
            </div>

            <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors hidden lg:block" />
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-slate-500 text-sm">
            Page {page} of {pages} · {total.toLocaleString()} users
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}
              className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={15} /> Prev
            </button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page === pages}
              className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
