'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { Plus, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { formatNGN } from '@/lib/utils';
import { TransactionItem } from '@/components/ui/TransactionItem';

export default function WalletPage() {
  const { wallet, transactions, loading, fetchWallet, fetchTransactions } = useWallet();

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-dark to-brand-navy px-6 pt-14 lg:pt-8 pb-10">
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

      {/* Quick Actions */}
      <div className="px-5 -mt-5">
        <div className="bg-white rounded-2xl shadow-sm p-4 grid grid-cols-2 gap-3">
          <Link href="/wallet/fund"
            className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
            <div className="w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center">
              <Plus size={20} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-800">Fund Wallet</span>
          </Link>
          <Link href="/wallet/transfer"
            className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
              <ArrowUpRight size={20} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-800">Transfer</span>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 mt-4">
        <div className="bg-white rounded-2xl p-4 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <ArrowDownLeft size={16} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Funded</p>
              <p className="text-sm font-bold text-gray-900">{formatNGN(wallet?.totalFunded ?? 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <ArrowUpRight size={16} className="text-red-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Spent</p>
              <p className="text-sm font-bold text-gray-900">{formatNGN(wallet?.totalSpent ?? 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="px-5 mt-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Transactions</h2>
          <Link href="/transactions" className="text-xs text-brand-blue font-semibold">See all</Link>
        </div>
        <div className="bg-white rounded-2xl px-4">
          {transactions.slice(0, 8).map((tx) => <TransactionItem key={tx._id} tx={tx} />)}
          {transactions.length === 0 && !loading && (
            <div className="py-10 text-center text-gray-400 text-sm">No transactions yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
