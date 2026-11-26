'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { networkColors } from '@/lib/utils';
import { cn } from '@/lib/cn';

export interface NetworkOption<T extends string> {
  name: T;
  logoUrl?: string | null;
}

interface NetworkSelectorProps<T extends string> {
  networks: NetworkOption<T>[];
  value: T;
  onChange: (network: T) => void;
  label?: string;
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 8, scale: 0.9 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: 'easeOut' as const } } };

// Real network logo (sourced from AidaPay's own provider_image_url — no
// local asset management) on a neutral white tile, falling back to the
// colored-letter badge if there's no URL or the image fails to load.
export function NetworkBadge<T extends string>({ name, logoUrl, selected, size = 'md', className }: { name: T; logoUrl?: string | null; selected?: boolean; size?: 'md' | 'lg'; className?: string }) {
  const [failed, setFailed] = useState(false);
  const showLogo = !!logoUrl && !failed;

  return (
    <div className={cn(
      'rounded-2xl flex items-center justify-center font-black transition-all overflow-hidden',
      size === 'lg' ? 'w-16 h-16 text-xl' : 'w-12 h-12 text-base',
      showLogo ? 'bg-white p-2' : (networkColors[name] ?? 'bg-surface-2 text-ink-muted'),
      selected === undefined ? '' : selected ? 'ring-2 ring-offset-2 ring-offset-surface ring-brand-blue' : 'opacity-60',
      className
    )}>
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl!} alt={name} className="w-full h-full object-contain" onError={() => setFailed(true)} />
      ) : (
        name.charAt(0)
      )}
    </div>
  );
}

export function NetworkSelector<T extends string>({ networks, value, onChange, label = 'Network' }: NetworkSelectorProps<T>) {
  return (
    <div>
      {label && <label className="text-sm font-medium text-ink-muted mb-2 block">{label}</label>}
      <motion.div variants={stagger} initial="hidden" animate="show" className={cn('grid gap-2', networks.length === 3 ? 'grid-cols-3' : 'grid-cols-4')}>
        {networks.map(({ name: n, logoUrl }) => {
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
                <NetworkBadge name={n} logoUrl={logoUrl} selected={selected} />
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
