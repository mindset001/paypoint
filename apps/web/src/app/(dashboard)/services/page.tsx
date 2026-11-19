'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Phone, Wifi, Tv, Zap, BookOpen, PiggyBank } from 'lucide-react';

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

export default function ServicesPage() {
  return (
    <div>
      <div className="bg-gradient-to-b from-brand-dark to-brand-navy px-6 pt-14 md:pt-8 pb-6">
        <h1 className="text-white text-xl font-bold">Services</h1>
        <p className="text-blue-300 text-sm mt-1">Everything you need, one wallet</p>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="px-4 py-5 flex flex-col gap-3">
        {SERVICES.map(({ id, name, desc, icon: Icon, color, border, gradient }) => (
          <motion.div key={id} variants={item} whileTap={{ scale: 0.98 }}>
            <Link
              href={`/${id}`}
              className={`bg-surface rounded-2xl border ${border} p-4 flex items-center gap-4 hover:shadow-md transition-shadow`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink">{name}</p>
                <p className="text-ink-muted text-sm mt-0.5">{desc}</p>
              </div>
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                <span className="text-white text-lg font-bold leading-none">›</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
