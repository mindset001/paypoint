'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Phone, Wifi, Tv, Zap, BookOpen, PiggyBank, PhoneForwarded, Layers } from 'lucide-react';
import { servicesApi } from '@/lib/api';

// Services whose visibility is admin-controlled (Admin > Settings > Feature
// Visibility) rather than always live — maps a tile's id to its flag key.
const FEATURE_KEY_BY_SERVICE: Record<string, string> = { exam: 'exam', savings: 'savings' };

// A compact icon-grid instead of the old full-width card list — that
// layout stopped scaling once this list started growing past 6 items.
// Add new tiles here; the grid just wraps, no layout changes needed.
const SERVICES = [
  { id: 'airtime', name: 'Airtime', icon: Phone, color: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600' },
  { id: 'data', name: 'Data', icon: Wifi, color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600' },
  { id: 'bulk-airtime', name: 'Bulk Airtime', icon: PhoneForwarded, color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' },
  { id: 'bulk-data', name: 'Bulk Data', icon: Layers, color: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600' },
  { id: 'cable', name: 'Cable TV', icon: Tv, color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600' },
  { id: 'electricity', name: 'Electricity', icon: Zap, color: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600' },
  { id: 'exam', name: 'Exam Pins', icon: BookOpen, color: 'bg-green-50 dark:bg-green-500/10 text-green-600' },
  { id: 'savings', name: 'Savings', icon: PiggyBank, color: 'bg-pink-50 dark:bg-pink-500/10 text-pink-600' },
];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } } };

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

      <motion.div variants={stagger} initial="hidden" animate="show" className="px-5 py-6 grid grid-cols-4 gap-x-2 gap-y-5">
        {SERVICES.filter(({ id }) => {
          const flagKey = FEATURE_KEY_BY_SERVICE[id];
          return !flagKey || featureFlags[flagKey] !== 'hidden';
        }).map(({ id, name, icon: Icon, color }) => {
          const flagKey = FEATURE_KEY_BY_SERVICE[id];
          const comingSoon = flagKey ? featureFlags[flagKey] === 'coming_soon' : false;

          const tileContent = (
            <>
              <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center ${comingSoon ? 'bg-surface-2 text-ink-muted' : color}`}>
                <Icon size={24} />
                {comingSoon && (
                  <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold uppercase tracking-wide bg-amber-500 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    Soon
                  </span>
                )}
              </div>
              <p className="text-ink text-xs font-semibold text-center leading-tight">{name}</p>
            </>
          );

          return (
            <motion.div key={id} variants={item} whileTap={comingSoon ? undefined : { scale: 0.94 }}>
              {comingSoon ? (
                <div className="flex flex-col items-center gap-2 opacity-60 cursor-not-allowed">
                  {tileContent}
                </div>
              ) : (
                <Link href={`/${id}`} className="flex flex-col items-center gap-2">
                  {tileContent}
                </Link>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
