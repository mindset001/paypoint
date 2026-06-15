'use client';
import { useEffect, useState } from 'react';
import { walletApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import type { Transaction } from '@/types';
import { Filter, X, Printer, ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatNGN, formatDate, txTypeLabel } from '@/lib/utils';

const TYPE_FILTERS = ['All', 'airtime', 'data', 'cable', 'electricity', 'wallet_fund', 'refund'];
const STATUS_FILTERS = ['Any', 'success', 'pending', 'failed'];

const statusStyle: Record<string, string> = {
  success: 'text-green-600 bg-green-50',
  pending: 'text-yellow-600 bg-yellow-50',
  failed:  'text-red-500 bg-red-50',
  reversed:'text-gray-500 bg-gray-100',
};

function ReceiptModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const isCredit = tx.direction === 'credit';
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="font-black text-gray-900">Transaction Receipt</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <X size={16} />
          </button>
        </div>

        {/* Amount badge */}
        <div className="flex flex-col items-center py-6">
          <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center mb-3',
            isCredit ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500')}>
            {isCredit ? <ArrowDownLeft size={28} /> : <ArrowUpRight size={28} />}
          </div>
          <p className={cn('text-3xl font-black', isCredit ? 'text-green-600' : 'text-gray-900')}>
            {isCredit ? '+' : '-'}{formatNGN(tx.amount)}
          </p>
          <span className={cn('mt-2 text-xs font-semibold px-3 py-1 rounded-full capitalize', statusStyle[tx.status] ?? 'bg-gray-100 text-gray-500')}>
            {tx.status}
          </span>
        </div>

        {/* Details */}
        <div className="px-5 pb-5 flex flex-col gap-2 text-sm">
          {[
            ['Type',        txTypeLabel[tx.type] ?? tx.type],
            ['Reference',   tx.reference],
            ['Date',        formatDate(tx.createdAt)],
            ['Balance Before', formatNGN(tx.balanceBefore)],
            ['Balance After',  formatNGN(tx.balanceAfter)],
            ...(tx.meta?.phone    ? [['Phone',    tx.meta.phone]]    : []),
            ...(tx.meta?.network  ? [['Network',  tx.meta.network]]  : []),
            ...(tx.meta?.provider ? [['Provider', tx.meta.provider]] : []),
            ...(tx.failureReason  ? [['Reason',   tx.failureReason]] : []),
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-start gap-2">
              <span className="text-gray-400 flex-shrink-0">{label}</span>
              <span className="text-gray-900 font-medium text-right break-all">{value}</span>
            </div>
          ))}
        </div>

        {/* Print */}
        <div className="px-5 pb-5">
          <button
            onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 font-semibold py-3 rounded-2xl text-sm hover:bg-gray-50 transition-colors"
          >
            <Printer size={16} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

function TxRow({ tx, onClick }: { tx: Transaction; onClick: () => void }) {
  const isCredit = tx.direction === 'credit';
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 text-left hover:bg-gray-50 transition-colors px-1 rounded-xl">
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
        isCredit ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500')}>
        {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{txTypeLabel[tx.type] ?? tx.type}</p>
        <p className="text-xs text-gray-400 truncate">{formatDate(tx.createdAt)}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={cn('text-sm font-bold', isCredit ? 'text-green-600' : 'text-gray-900')}>
          {isCredit ? '+' : '-'}{formatNGN(tx.amount)}
        </p>
        <span className={cn('text-xs capitalize font-medium px-1.5 py-0.5 rounded-full', statusStyle[tx.status] ?? 'bg-gray-100 text-gray-500')}>
          {tx.status}
        </span>
      </div>
    </button>
  );
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Any');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);

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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand-dark px-6 pt-14 lg:pt-8 pb-5">
        <h1 className="text-white text-xl font-bold">Transactions</h1>
      </div>

      {/* Type filter */}
      <div className="bg-white border-b border-gray-100">
        <div className="flex gap-1 px-4 py-3 overflow-x-auto hide-scrollbar">
          {TYPE_FILTERS.map((f) => (
            <button key={f} onClick={() => setTypeFilter(f)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0',
                typeFilter === f ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-600')}>
              {f === 'All' ? 'All Types' : f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Status + date row */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2">
        <div className="flex gap-1 flex-1 overflow-x-auto hide-scrollbar">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all',
                statusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500')}>
              {s === 'Any' ? 'Any Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={() => setShowDate(!showDate)}
          className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 transition-all',
            hasDateFilter ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-500')}>
          <Calendar size={11} /> Date
        </button>
      </div>

      {/* Date picker panel */}
      {showDate && (
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
          </div>
          <button onClick={applyDate} className="px-4 py-2 bg-brand-blue text-white text-sm font-bold rounded-xl flex-shrink-0">Apply</button>
          {hasDateFilter && <button onClick={clearDate} className="text-xs text-gray-400 underline flex-shrink-0">Clear</button>}
        </div>
      )}

      <div className="px-4 py-4">
        <div className="bg-white rounded-2xl px-4 divide-y divide-gray-50">
          {loading && transactions.length === 0 ? (
            Array(8).fill(0).map((_, i) => (
              <div key={i} className="py-3 flex gap-3 items-center animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-2 bg-gray-100 rounded w-1/2" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            ))
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-2">
              <Filter size={32} className="text-gray-200" />
              <p className="text-sm font-medium">No transactions found</p>
              <p className="text-xs text-gray-300">Try adjusting your filters</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <TxRow key={tx._id} tx={tx} onClick={() => setSelected(tx)} />
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

      {selected && <ReceiptModal tx={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
