'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Phone, Wifi, Tv, Zap, BookOpen, PiggyBank, PhoneForwarded, Layers, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

const icons: Record<string, LucideIcon> = {
  phone: Phone,
  wifi: Wifi,
  tv: Tv,
  zap: Zap,
  book: BookOpen,
  piggyBank: PiggyBank,
  phoneForwarded: PhoneForwarded,
  layers: Layers,
};

const colors: Record<string, string> = {
  airtime: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10',
  data: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10',
  'bulk-airtime': 'bg-amber-50 text-amber-600 dark:bg-amber-500/10',
  'bulk-data': 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10',
  cable: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10',
  electricity: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10',
  exam: 'bg-green-50 text-green-600 dark:bg-green-500/10',
  savings: 'bg-pink-50 text-pink-600 dark:bg-pink-500/10',
};

interface ServiceCardProps {
  id: string;
  name: string;
  icon: string;
  comingSoon?: boolean;
}

export function ServiceCard({ id, name, icon, comingSoon }: ServiceCardProps) {
  const Icon = icons[icon] ?? Phone;
  const content = (
    <>
      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', comingSoon ? 'bg-surface-2 text-ink-muted/60' : colors[id] ?? 'bg-surface-2 text-ink-muted')}>
        <Icon size={22} />
      </div>
      <span className={cn('text-xs font-medium text-center leading-tight', comingSoon ? 'text-ink-muted/60' : 'text-ink-muted')}>{name}</span>
      {comingSoon && (
        <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-full -mt-1">
          Soon
        </span>
      )}
    </>
  );

  if (comingSoon) {
    return (
      <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-surface shadow-sm opacity-70 cursor-not-allowed">
        {content}
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4, rotateX: -6, scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      style={{ perspective: 400 }}
    >
      <Link
        href={`/${id}`}
        className={cn(
          'flex flex-col items-center gap-2 p-3 rounded-2xl bg-surface shadow-sm transition-shadow duration-200',
          'hover:shadow-lg',
        )}
      >
        {content}
      </Link>
    </motion.div>
  );
}
