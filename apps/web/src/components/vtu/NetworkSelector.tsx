'use client';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { networkColors } from '@/lib/utils';
import { cn } from '@/lib/cn';

interface NetworkSelectorProps<T extends string> {
  networks: T[];
  value: T;
  onChange: (network: T) => void;
  label?: string;
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 8, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: 'easeOut' as const } } };

// Colored "logo" badge + label, replacing the old flat text pill — matches
// the circular-badge language already used elsewhere in the app (Services
// grid, data page's header chip) instead of a plain bordered button.
export function NetworkSelector<T extends string>({ networks, value, onChange, label = 'Network' }: NetworkSelectorProps<T>) {
  return (
    <div>
      {label && <label className="text-sm font-medium text-ink-muted mb-2 block">{label}</label>}
      <motion.div variants={stagger} initial="hidden" animate="show" className={cn('grid gap-2', networks.length === 3 ? 'grid-cols-3' : 'grid-cols-4')}>
        {networks.map((n) => {
          const selected = value === n;
          return (
            <motion.button
              key={n}
              type="button"
              variants={item}
              whileTap={{ scale: 0.93 }}
              onClick={() => onChange(n)}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="relative">
                <div className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base transition-all',
                  networkColors[n] ?? 'bg-surface-2 text-ink-muted',
                  selected ? 'ring-2 ring-offset-2 ring-offset-surface ring-brand-blue' : 'opacity-60'
                )}>
                  {n.charAt(0)}
                </div>
                {selected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand-blue text-white flex items-center justify-center ring-2 ring-surface"
                  >
                    <Check size={12} strokeWidth={3} />
                  </motion.div>
                )}
              </div>
              <span className={cn('text-[11px] font-bold', selected ? 'text-ink' : 'text-ink-muted')}>{n}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
