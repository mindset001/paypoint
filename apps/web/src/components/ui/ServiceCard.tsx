'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Phone, Wifi, Tv, Zap, BookOpen, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

const icons: Record<string, LucideIcon> = {
  phone: Phone,
  wifi: Wifi,
  tv: Tv,
  zap: Zap,
  book: BookOpen,
};

const colors: Record<string, string> = {
  airtime: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10',
  data: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10',
  cable: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10',
  electricity: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10',
  exam: 'bg-green-50 text-green-600 dark:bg-green-500/10',
};

interface ServiceCardProps {
  id: string;
  name: string;
  icon: string;
}

export function ServiceCard({ id, name, icon }: ServiceCardProps) {
  const Icon = icons[icon] ?? Phone;
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
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', colors[id] ?? 'bg-surface-2 text-ink-muted')}>
          <Icon size={22} />
        </div>
        <span className="text-xs font-medium text-ink-muted text-center leading-tight">{name}</span>
      </Link>
    </motion.div>
  );
}
