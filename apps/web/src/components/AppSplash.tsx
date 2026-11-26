'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

// Only runs inside the native Capacitor shell — a plain web visit never
// shows this and loads instantly as before. Capacitor's native splash
// (apps/mobile/capacitor.config.ts) is configured with launchAutoHide:
// false specifically so it stays up, gap-free, until the call below
// crossfades it straight into this animated one.
const MIN_DISPLAY_MS = 1100;

export function AppSplash() {
  const [isNative, setIsNative] = useState(false);
  const [checkedPlatform, setCheckedPlatform] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    import('@capacitor/core').then(({ Capacitor }) => {
      if (cancelled) return;
      const native = Capacitor.isNativePlatform();
      setIsNative(native);
      setCheckedPlatform(true);
      if (native) {
        import('@capacitor/splash-screen').then(({ SplashScreen }) => {
          SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
        });
      }
    }).catch(() => setCheckedPlatform(true));

    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_DISPLAY_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const visible = checkedPlatform && isNative && !minTimeElapsed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="app-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0f172a]"
        >
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: [0.75, 1.05, 1], opacity: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="bg-white rounded-2xl px-6 py-4 shadow-2xl"
          >
            <Image src="/icons/wordmark.png" alt="Paycen" width={180} height={46} priority className="h-11 w-auto" />
          </motion.div>

          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 96, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="h-[3px] mt-8 rounded-full bg-white/10 overflow-hidden"
          >
            <motion.div
              className="h-full bg-brand-blue rounded-full"
              animate={{ x: ['-100%', '150%'] }}
              transition={{ delay: 0.5, duration: 1, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: '50%' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
