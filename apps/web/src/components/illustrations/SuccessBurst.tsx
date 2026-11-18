'use client';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

// Replaces a plain CheckCircle icon on payment-success screens with a small
// celebratory moment: a scale-in check ringed by sparkles that pop outward.
export function SuccessBurst({ size = 72 }: { size?: number }) {
  const sparkles = [0, 60, 120, 180, 240, 300];
  return (
    <div className="relative flex items-center justify-center" style={{ width: size * 1.8, height: size * 1.8 }}>
      {sparkles.map((angle, i) => (
        <motion.span
          key={angle}
          className="absolute w-1.5 h-1.5 rounded-full bg-brand-blue"
          style={{ top: '50%', left: '50%' }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            x: Math.cos((angle * Math.PI) / 180) * size * 0.9,
            y: Math.sin((angle * Math.PI) / 180) * size * 0.9,
            scale: [0, 1, 0.5],
          }}
          transition={{ duration: 0.9, delay: 0.15 + i * 0.03, ease: 'easeOut' }}
        />
      ))}
      <motion.div
        className="relative flex items-center justify-center rounded-full bg-green-100 dark:bg-green-500/15"
        style={{ width: size, height: size }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 16 }}
      >
        <Check size={size * 0.45} className="text-green-600" strokeWidth={3} />
      </motion.div>
    </div>
  );
}
