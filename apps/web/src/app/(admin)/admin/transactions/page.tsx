'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeftRight, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatNGN } from '@/lib/utils';
import type { AdminTransactionRow } from '@/types';

const STATUS_BADGE: Record<string, string> = {
  success:  'bg-green-500/10 text-green-400 border-green-500/20',
  failed:   'bg-red-500/10 text-red-400 border-red-500/20',
  pending:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  reversed: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const TYPE_LABEL: Record<string, string> = {
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
  referral_bonus:         'Referral Bonus',
  refund:                 'Refund',
};

function TransactionsInner() {
  const searchParams = useSearchParams();
  const [txns, setTxns]     = useState<AdminTransactionRow[]>([]);
  const [total, setTotal]   = useState(0);
  const [pages, setPages]   = useState(1);
  const [page, setPage]     = useState(1);
  const [type, setType]     = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [userId, setUserId] = useState(searchParams.get('userId') ?? '');
  const [from, setFrom]     = useState('');
  const [to, setTo]         = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr]       = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    adminApi.transactions({ page, limit: 30, type, status, userId, from, to })
      .then((r) => {
        setTxns(r.data.data.transactions);
        setTotal(r.data.data.total);
        setPages(r.data.data.pages);
      })
      .catch((e) => setErr(e.response?.data?.message ?? 'Failed to load transactions'))
      .finally(() => setLoading(false));
  }, [page, type, status, userId, from, to]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [type, status, userId, from, to]);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-black">Transactions</h1>
          <p className="text-slate-400 text-sm mt-0.5">{total.toLocaleString()} total</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-slate-400" />
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Filters</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="col-span-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue/60">
            <option value="">All types</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="col-span-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue/60">
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="reversed">Reversed</option>
          </select>

          <input
            type="text"
            placeholder="User ID…"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="col-span-2 lg:col-span-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue/60"
          />

          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue/60 [color-scheme:dark]"
          />

          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-blue/60 [color-scheme:dark]"
          />
        </div>
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
        {/* Header */}
        <div className="hidden lg:grid grid-cols-[140px_1fr_110px_80px_90px_100px_90px] gap-4 px-5 py-3 border-b border-slate-700/50">
          {['Date', 'User', 'Type', 'Dir.', 'Amount', 'Status', 'Ref'].map((h) => (
            <p key={h} className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{h}</p>
          ))}
        </div>

        {loading && (
          <div className="divide-y divide-slate-700/30">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="px-5 py-3 flex gap-4 animate-pulse">
                <div className="h-3 bg-slate-700 rounded w-24" />
                <div className="h-3 bg-slate-700/60 rounded flex-1" />
                <div className="h-3 bg-slate-700/40 rounded w-16" />
              </div>
            ))}
          </div>
        )}

        {!loading && txns.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ArrowLeftRight size={36} className="text-slate-600 mb-3" />
            <p className="text-slate-400 font-semibold">No transactions found</p>
            <p className="text-slate-600 text-sm mt-1">Try adjusting your filters</p>
          </div>
        )}

        {!loading && txns.map((tx) => (
          <div key={tx._id}
            className="grid grid-cols-1 lg:grid-cols-[140px_1fr_110px_80px_90px_100px_90px] gap-1 lg:gap-4 items-center px-5 py-3.5 border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">

            {/* Date */}
            <p className="text-slate-500 text-xs">
              {new Date(tx.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
              {' '}
              {new Date(tx.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
            </p>

            {/* User */}
            <div className="min-w-0">
              {tx.userId ? (
                <>
                  <p className="text-slate-200 text-sm font-medium truncate">
                    {tx.userId.firstName} {tx.userId.lastName}
                  </p>
                  <p className="text-slate-500 text-xs">{tx.userId.phone?.number}</p>
                </>
              ) : (
                <p className="text-slate-500 text-sm">—</p>
              )}
            </div>

            {/* Type */}
            <p className="text-slate-300 text-sm">{TYPE_LABEL[tx.type] ?? tx.type}</p>

            {/* Direction */}
            <span className={`text-xs font-semibold ${tx.direction === 'credit' ? 'text-green-400' : 'text-slate-400'}`}>
              {tx.direction}
            </span>

            {/* Amount */}
            <p className={`text-sm font-semibold ${tx.direction === 'credit' ? 'text-green-400' : 'text-white'}`}>
              {tx.direction === 'credit' ? '+' : '−'}{formatNGN(tx.amount / 100)}
            </p>

            {/* Status */}
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium inline-flex w-fit ${STATUS_BADGE[tx.status] ?? ''}`}>
              {tx.status}
            </span>

            {/* Ref */}
            <p className="text-slate-600 text-xs truncate font-mono">{tx.reference.slice(-8)}</p>
          </div>
        ))}
      </div>

      {/* Failed tx detail tooltip-like panel */}
      {!loading && txns.some((t) => t.status === 'failed' && t.failureReason) && (
        <div className="mt-4 bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400 text-xs font-semibold uppercase tracking-wide mb-2">Failure reasons in this page</p>
          <div className="space-y-1.5">
            {txns.filter((t) => t.status === 'failed' && t.failureReason).map((t) => (
              <p key={t._id} className="text-slate-400 text-xs">
                <code className="text-slate-500">{t.reference.slice(-8)}</code> — {t.failureReason}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-slate-500 text-sm">
            Page {page} of {pages} · {total.toLocaleString()} transactions
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

export default function AdminTransactionsPage() {
  return (
    <Suspense>
      <TransactionsInner />
    </Suspense>
  );
}
