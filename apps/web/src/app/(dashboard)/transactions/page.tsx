'use client';
import { useEffect, useState } from 'react';
import { walletApi } from '@/lib/api';
import { TransactionItem } from '@/components/ui/TransactionItem';
import { Button } from '@/components/ui/Button';
import type { Transaction } from '@/types';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/cn';

const FILTERS = ['All', 'airtime', 'data', 'cable', 'electricity', 'wallet_fund', 'refund'];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = async (p = 1, type?: string) => {
    setLoading(true);
    try {
      const { data } = await walletApi.transactions({ page: p, limit: 20, type: type === 'All' ? undefined : type });
      if (p === 1) setTransactions(data.data.transactions);
      else setTransactions((prev) => [...prev, ...data.data.transactions]);
      setHasMore(p < data.data.pagination.pages);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    setPage(1);
    load(1, filter);
  }, [filter]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    load(next, filter);
  };

  return (
    <div>
      <div className="bg-brand-dark px-6 pt-14 lg:pt-8 pb-5">
        <h1 className="text-white text-xl font-bold">Transactions</h1>
      </div>

      {/* Filter tabs */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="flex gap-1 px-4 py-3 overflow-x-auto hide-scrollbar">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0',
                filter === f ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-600')}>
              {f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

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
              <p className="text-sm">No transactions found</p>
            </div>
          ) : (
            transactions.map((tx) => <TransactionItem key={tx._id} tx={tx} />)
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
