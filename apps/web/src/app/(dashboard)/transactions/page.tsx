'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { walletApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import type { Transaction } from '@/types';
import { Filter, X, ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatNGN, formatDate, txTypeLabel } from '@/lib/utils';
import { EmptyStateIllustration } from '@/components/illustrations/EmptyState';

const TYPE_FILTERS = ['All', 'airtime', 'data', 'cable', 'electricity', 'wallet_fund', 'refund'];
const STATUS_FILTERS = ['Any', 'success', 'pending', 'failed'];

const statusStyle: Record<string, string> = {
  success: 'text-green-600 bg-green-50 dark:bg-green-500/15',
  pending: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-500/15',
  failed:  'text-red-500 bg-red-50 dark:bg-red-500/15',
  reversed:'text-ink-muted bg-surface-2',
};

function TxRow({ tx, onClick }: { tx: Transaction; onClick: () => void }) {
  const isCredit = tx.direction === 'credit';
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-3 border-b border-line last:border-0 text-left hover:bg-surface-2 transition-colors px-1 rounded-xl">
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
        isCredit ? 'bg-green-100 dark:bg-green-500/15 text-green-600' : 'bg-red-100 dark:bg-red-500/15 text-red-500')}>
        {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink truncate">{txTypeLabel[tx.type] ?? tx.type}</p>
        <p className="text-xs text-ink-muted truncate">{formatDate(tx.createdAt)}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={cn('text-sm font-bold', isCredit ? 'text-green-600' : 'text-ink')}>
          {isCredit ? '+' : '-'}{formatNGN(tx.amount)}
        </p>
        <span className={cn('text-xs capitalize font-medium px-1.5 py-0.5 rounded-full', statusStyle[tx.status] ?? 'bg-surface-2 text-ink-muted')}>
          {tx.status}
        </span>
      </div>
    </button>
  );
}

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Any');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = async (p = 1, type = typeFilter, status = statusFilter, f = from, t = to) => {
    setLoading(true);
    try {
      const { data } = await walletApi.transactions({
        page: p,
        limit: 20,
        type:   type   !== 'All' ? type   : undefined,
        status: status !== 'Any' ? status : undefined,
        from: f || undefined,
        to:   t || undefined,
      });
      const list = data.data.transactions ?? [];
      if (p === 1) setTransactions(list);
      else setTransactions((prev) => [...prev, ...list]);
      setHasMore(p < data.data.pagination.pages);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    setPage(1);
    load(1, typeFilter, statusFilter, from, to);
  }, [typeFilter, statusFilter]);

  const applyDate = () => {
    setShowDate(false);
    setPage(1);
    load(1, typeFilter, statusFilter, from, to);
  };

  const clearDate = () => {
    setFrom('');
    setTo('');
    setPage(1);
    load(1, typeFilter, statusFilter, '', '');
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    load(next, typeFilter, statusFilter, from, to);
  };

  const hasDateFilter = from || to;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="bg-brand-dark px-6 pt-14 md:pt-8 pb-5">
        <h1 className="text-white text-xl font-bold">Transactions</h1>
      </div>

      {/* Type filter */}
      <div className="bg-surface border-b border-line">
        <div className="flex gap-1 px-4 py-3 overflow-x-auto hide-scrollbar">
          {TYPE_FILTERS.map((f) => (
            <button key={f} onClick={() => setTypeFilter(f)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0',
                typeFilter === f ? 'bg-brand-blue text-white' : 'bg-surface-2 text-ink-muted')}>
              {f === 'All' ? 'All Types' : f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Status + date row */}
      <div className="bg-surface border-b border-line px-4 py-2 flex items-center gap-2">
        <div className="flex gap-1 flex-1 overflow-x-auto hide-scrollbar">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors',
                statusFilter === s ? 'bg-ink text-canvas' : 'bg-surface-2 text-ink-muted')}>
              {s === 'Any' ? 'Any Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={() => setShowDate(!showDate)}
          className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 transition-colors',
            hasDateFilter ? 'bg-brand-blue text-white' : 'bg-surface-2 text-ink-muted')}>
          <Calendar size={11} /> Date
        </button>
      </div>

      {/* Date picker panel */}
      {showDate && (
        <div className="bg-surface border-b border-line px-4 py-3 flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-ink-muted block mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-line bg-surface text-ink rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-ink-muted block mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full border border-line bg-surface text-ink rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
          </div>
          <button onClick={applyDate} className="px-4 py-2 bg-brand-blue text-white text-sm font-bold rounded-xl flex-shrink-0">Apply</button>
          {hasDateFilter && <button onClick={clearDate} className="text-xs text-ink-muted underline flex-shrink-0">Clear</button>}
        </div>
      )}

      <div className="px-4 py-4">
        <div className="bg-surface rounded-2xl px-4 divide-y divide-line">
          {loading && transactions.length === 0 ? (
            Array(8).fill(0).map((_, i) => (
              <div key={i} className="py-3 flex gap-3 items-center animate-pulse">
                <div className="w-10 h-10 rounded-full bg-surface-2" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-surface-2 rounded w-3/4" />
                  <div className="h-2 bg-surface-2 rounded w-1/2" />
                </div>
                <div className="h-3 bg-surface-2 rounded w-16" />
              </div>
            ))
          ) : transactions.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center gap-2">
              <EmptyStateIllustration variant="inbox" />
              <p className="text-sm font-medium text-ink-muted">No transactions found</p>
              <p className="text-xs text-ink-muted/70">Try adjusting your filters</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <TxRow key={tx._id} tx={tx} onClick={() => router.push(`/receipt/${tx.reference}`)} />
            ))
          )}
        </div>

        {hasMore && (
          <div className="mt-4">
            <Button variant="secondary" fullWidth loading={loading} onClick={loadMore}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
