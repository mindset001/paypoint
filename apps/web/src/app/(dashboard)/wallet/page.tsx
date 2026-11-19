'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { formatNGN } from '@/lib/utils';
import { TransactionItem } from '@/components/ui/TransactionItem';
import { EmptyStateIllustration } from '@/components/illustrations/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } } };

export default function WalletPage() {
  const { wallet, transactions, loading, fetchWallet, fetchTransactions } = useWallet();

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-dark to-brand-navy px-6 pt-14 md:pt-8 pb-10">
        <h1 className="text-white text-xl font-bold mb-6">My Wallet</h1>
        <div className="text-center">
          <p className="text-blue-300 text-sm mb-1">Available Balance</p>
          {loading ? (
            <div className="h-10 w-40 bg-white/20 animate-pulse rounded-lg mx-auto" />
          ) : (
            <p className="text-white text-4xl font-black">{formatNGN(wallet?.balance ?? 0)}</p>
          )}
          <p className="text-blue-400 text-xs mt-1 capitalize">{wallet?.tier ?? 'basic'} account</p>
        </div>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show">
        {/* Quick Actions */}
        <motion.div variants={item} className="px-5 -mt-5">
          <div className="bg-surface rounded-2xl shadow-sm p-4 grid grid-cols-2 gap-3">
            <Link href="/wallet/fund"
              className="flex flex-col items-center gap-2 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors">
              <div className="w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center">
                <Plus size={20} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-ink">Fund Wallet</span>
            </Link>
            <Link href="/wallet/transfer"
              className="flex flex-col items-center gap-2 p-4 bg-green-50 dark:bg-green-500/10 rounded-xl hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <ArrowUpRight size={20} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-ink">Transfer</span>
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="px-5 mt-4">
          <div className="bg-surface rounded-2xl p-4 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-100 dark:bg-green-500/15 rounded-full flex items-center justify-center flex-shrink-0">
                <ArrowDownLeft size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-ink-muted">Total Funded</p>
                <p className="text-sm font-bold text-ink">{formatNGN(wallet?.totalFunded ?? 0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center flex-shrink-0">
                <ArrowUpRight size={16} className="text-red-500" />
              </div>
              <div>
                <p className="text-xs text-ink-muted">Total Spent</p>
                <p className="text-sm font-bold text-ink">{formatNGN(wallet?.totalSpent ?? 0)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Transactions */}
        <motion.div variants={item} className="px-5 mt-4 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-ink-muted uppercase tracking-wide">Transactions</h2>
            <Link href="/transactions" className="text-xs text-brand-blue font-semibold">See all</Link>
          </div>
          <div className="bg-surface rounded-2xl px-4">
            {loading && transactions.length === 0 && (
              <div className="flex flex-col gap-3 py-3">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                    <div className="flex-1 flex flex-col gap-1.5">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-2.5 w-1/3" />
                    </div>
                    <Skeleton className="h-3 w-14" />
                  </div>
                ))}
              </div>
            )}
            {!loading && transactions.slice(0, 8).map((tx) => <TransactionItem key={tx._id} tx={tx} />)}
            {transactions.length === 0 && !loading && (
              <div className="py-10 flex flex-col items-center text-center gap-2">
                <EmptyStateIllustration variant="wallet" />
                <p className="text-ink-muted text-sm">No transactions yet</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
