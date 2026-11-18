'use client';
import { motion } from 'framer-motion';

interface EmptyStateIllustrationProps {
  variant: 'wallet' | 'inbox';
  className?: string;
}

// Hand-drawn, on-brand inline SVGs — same blue-blob visual language as the
// landing page's hero decoration, not a generic icon-pack illustration.
export function EmptyStateIllustration({ variant, className }: EmptyStateIllustrationProps) {
  return (
    <motion.svg
      viewBox="0 0 160 160"
      className={className}
      width={120}
      height={120}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <defs>
        <linearGradient id={`glow-${variant}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="80" r="70" className="fill-surface-2" />
      <circle cx="80" cy="80" r="70" fill={`url(#glow-${variant})`} opacity="0.08" />

      {variant === 'wallet' ? (
        <g>
          <rect x="42" y="58" width="76" height="52" rx="10" className="fill-surface" stroke="url(#glow-wallet)" strokeWidth="2" />
          <rect x="42" y="58" width="76" height="18" rx="10" fill="url(#glow-wallet)" />
          <circle cx="100" cy="86" r="7" className="fill-surface" stroke="url(#glow-wallet)" strokeWidth="2" />
          <path d="M50 46 L70 46" stroke="url(#glow-wallet)" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
          <path d="M58 40 L72 40" stroke="url(#glow-wallet)" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
        </g>
      ) : (
        <g>
          <rect x="44" y="54" width="72" height="56" rx="12" className="fill-surface" stroke="url(#glow-inbox)" strokeWidth="2" />
          <path d="M44 66 L80 92 L116 66" fill="none" stroke="url(#glow-inbox)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="106" cy="52" r="6" fill="url(#glow-inbox)" />
        </g>
      )}
    </motion.svg>
  );
}
