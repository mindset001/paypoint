'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Phone, Wifi, Tv, Zap, BookOpen, PiggyBank } from 'lucide-react';
import { servicesApi } from '@/lib/api';

// Services whose visibility is admin-controlled (Admin > Settings > Feature
// Visibility) rather than always live — maps a tile's id to its flag key.
const FEATURE_KEY_BY_SERVICE: Record<string, string> = { exam: 'exam', savings: 'savings' };

const SERVICES = [
  {
    id: 'airtime',
    name: 'Airtime',
    desc: 'Recharge any network instantly',
    icon: Phone,
    color: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600',
    border: 'border-yellow-100 dark:border-yellow-500/20',
    gradient: 'from-yellow-400 to-orange-400',
  },
  {
    id: 'data',
    name: 'Data',
    desc: 'SME & corporate data bundles',
    icon: Wifi,
    color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600',
    border: 'border-blue-100 dark:border-blue-500/20',
    gradient: 'from-brand-blue to-blue-700',
  },
  {
    id: 'cable',
    name: 'Cable TV',
    desc: 'DStv, GOtv, Startimes',
    icon: Tv,
    color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600',
    border: 'border-purple-100 dark:border-purple-500/20',
    gradient: 'from-purple-600 to-purple-800',
  },
  {
    id: 'electricity',
    name: 'Electricity',
    desc: 'Prepaid & postpaid meters',
    icon: Zap,
    color: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600',
    border: 'border-orange-100 dark:border-orange-500/20',
    gradient: 'from-orange-500 to-orange-700',
  },
  {
    id: 'exam',
    name: 'Exam Pins',
    desc: 'WAEC, NECO, NABTEB, JAMB',
    icon: BookOpen,
    color: 'bg-green-50 dark:bg-green-500/10 text-green-600',
    border: 'border-green-100 dark:border-green-500/20',
    gradient: 'from-green-600 to-green-800',
  },
  {
    id: 'savings',
    name: 'Savings',
    desc: 'Lock money away for a goal',
    icon: PiggyBank,
    color: 'bg-pink-50 dark:bg-pink-500/10 text-pink-600',
    border: 'border-pink-100 dark:border-pink-500/20',
    gradient: 'from-pink-500 to-pink-700',
  },
];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } } };

// Mirrors the API's own defaults (apps/api/src/services/featureFlags.service.js)
// so a tile doesn't flash the wrong state (e.g. "Coming Soon" for
// already-live savings) in the gap before the real flags load.
const DEFAULT_FLAGS = { exam: 'coming_soon', reseller: 'coming_soon', savings: 'live' };

export default function ServicesPage() {
  const [featureFlags, setFeatureFlags] = useState<Record<string, string>>(DEFAULT_FLAGS);

  useEffect(() => {
    servicesApi.features().then((r) => setFeatureFlags(r.data.data)).catch(() => {});
  }, []);

  return (
    <div>
      <div className="bg-gradient-to-b from-brand-dark to-brand-navy px-6 pt-14 md:pt-8 pb-6">
        <h1 className="text-white text-xl font-bold">Services</h1>
        <p className="text-blue-300 text-sm mt-1">Everything you need, one wallet</p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="px-4 py-5 flex flex-col gap-3">
        {SERVICES.filter(({ id }) => {
          const flagKey = FEATURE_KEY_BY_SERVICE[id];
          return !flagKey || featureFlags[flagKey] !== 'hidden';
        }).map(({ id, name, desc, icon: Icon, color, border, gradient }) => {
          const flagKey = FEATURE_KEY_BY_SERVICE[id];
          const comingSoon = flagKey ? featureFlags[flagKey] === 'coming_soon' : false;
          const cardContent = (
            <>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${comingSoon ? 'bg-surface-2 text-ink-muted' : color}`}>
                <Icon size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink">{name}</p>
                <p className="text-ink-muted text-sm mt-0.5">{desc}</p>
              </div>
              {comingSoon ? (
                <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-full flex-shrink-0">
                  Coming Soon
                </span>
              ) : (
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-lg font-bold leading-none">›</span>
                </div>
              )}
            </>
          );
          return (
            <motion.div key={id} variants={item} whileTap={comingSoon ? undefined : { scale: 0.98 }}>
              {comingSoon ? (
                <div className={`bg-surface rounded-2xl border ${border} p-4 flex items-center gap-4 opacity-70 cursor-not-allowed`}>
                  {cardContent}
                </div>
              ) : (
                <Link
                  href={`/${id}`}
                  className={`bg-surface rounded-2xl border ${border} p-4 flex items-center gap-4 hover:shadow-md transition-shadow`}
                >
                  {cardContent}
                </Link>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
