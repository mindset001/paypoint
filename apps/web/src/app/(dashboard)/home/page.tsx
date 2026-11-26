'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useWallet } from '@/hooks/useWallet';
import { WalletCard } from '@/components/ui/WalletCard';
import { ServiceCard } from '@/components/ui/ServiceCard';
import { TransactionItem } from '@/components/ui/TransactionItem';
import { EmptyStateIllustration } from '@/components/illustrations/EmptyState';
import { notificationsApi, servicesApi } from '@/lib/api';
import Link from 'next/link';

// Mirrors the tile set on /services — kept in sync manually since the two
// pages use different grid densities (Home shows a quick-access subset).
const SERVICES = [
  { id: 'airtime', name: 'Airtime', icon: 'phone' },
  { id: 'data', name: 'Data', icon: 'wifi' },
  { id: 'bulk-airtime', name: 'Bulk Airtime', icon: 'phoneForwarded' },
  { id: 'bulk-data', name: 'Bulk Data', icon: 'layers' },
  { id: 'cable', name: 'Cable TV', icon: 'tv' },
  { id: 'electricity', name: 'Electricity', icon: 'zap' },
  { id: 'exam', name: 'Exam Pins', icon: 'book' },
  { id: 'savings', name: 'Savings', icon: 'piggyBank' },
  { id: 'ajo', name: 'Ajo', icon: 'repeat' },
  { id: 'esim', name: 'eSIM', icon: 'globe' },
];

// Services whose visibility is admin-controlled — maps a tile's id to its
// feature-flag key (mirrors services/page.tsx's FEATURE_KEY_BY_SERVICE).
const FEATURE_KEY_BY_SERVICE: Record<string, string> = { exam: 'exam', savings: 'savings', esim: 'esim' };

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export default function HomePage() {
  const { user } = useAuthStore();
  const { wallet, transactions, loading, fetchWallet, fetchTransactions } = useWallet();
  const [unread, setUnread] = useState(0);
  // Mirrors the API's own defaults so there's no flash before the real flags load.
  const [featureFlags, setFeatureFlags] = useState<Record<string, string>>({ exam: 'coming_soon', reseller: 'coming_soon', savings: 'live', esim: 'coming_soon' });

  useEffect(() => {
    fetchWallet();
    fetchTransactions({ page: 1 });
    notificationsApi.unreadCount()
      .then((r) => setUnread(r.data.data.count))
      .catch(() => {});
    servicesApi.features()
      .then((r) => setFeatureFlags(r.data.data))
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-b from-brand-dark to-brand-navy px-6 pt-14 md:pt-8 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-blue-300 text-sm">Good day,</p>
            <h1 className="text-white text-xl font-bold">{user?.firstName} {user?.lastName}</h1>
          </div>
          <Link href="/notifications"
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white relative hover:bg-white/20 transition-colors">
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold px-1">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        </div>
        <WalletCard wallet={wallet} loading={loading} />
      </div>

      {/* Content */}
      <div className="px-4 -mt-2 flex flex-col gap-6 py-6">
        {/* Services Grid */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-ink-muted uppercase tracking-wide">Services</h2>
            <Link href="/services" className="text-xs text-brand-blue font-semibold">See all</Link>
          </div>
          <motion.div
            variants={gridVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-4 gap-3"
          >
            {SERVICES.filter((s) => {
              const flagKey = FEATURE_KEY_BY_SERVICE[s.id];
              return !flagKey || featureFlags[flagKey] !== 'hidden';
            }).map((s) => {
              const flagKey = FEATURE_KEY_BY_SERVICE[s.id];
              const comingSoon = flagKey ? featureFlags[flagKey] === 'coming_soon' : false;
              return (
                <motion.div key={s.id} variants={itemVariants}>
                  <ServiceCard {...s} comingSoon={comingSoon} />
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* Recent Transactions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-ink-muted uppercase tracking-wide">Recent Transactions</h2>
            <Link href="/transactions" className="text-xs text-brand-blue font-semibold">See all</Link>
          </div>
          <div className="bg-surface rounded-2xl px-4 divide-y divide-line">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
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
              <div className="py-10 flex flex-col items-center text-center gap-2">
                <EmptyStateIllustration variant="wallet" />
                <p className="text-ink-muted text-sm">No transactions yet</p>
              </div>
            ) : (
              transactions.slice(0, 5).map((tx) => <TransactionItem key={tx._id} tx={tx} />)
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
