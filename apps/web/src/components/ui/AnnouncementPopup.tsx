'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Megaphone } from 'lucide-react';
import { notificationsApi } from '@/lib/api';
import { Button } from './Button';
import type { Notification } from '@/types';

// Checked once per dashboard mount — admin broadcasts flagged as a pop-up
// (meta.displayType === 'popup') show as a blocking modal here instead of
// just sitting in the bell icon's list, until the user dismisses them.
export function AnnouncementPopup() {
  const [queue, setQueue] = useState<Notification[]>([]);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    notificationsApi.popups()
      .then((r) => setQueue(r.data.data))
      .catch(() => {});
  }, []);

  const current = queue[0];

  const dismiss = async () => {
    if (!current || dismissing) return;
    setDismissing(true);
    try {
      await notificationsApi.markRead(current._id);
    } catch {
      // Still move on client-side — worst case it shows again next visit.
    } finally {
      setQueue((q) => q.slice(1));
      setDismissing(false);
    }
  };

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current._id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-sm bg-surface rounded-2xl p-6 shadow-xl"
          >
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 rounded-full flex items-center justify-center mb-4">
              <Megaphone size={22} className="text-purple-600" />
            </div>
            <p className="text-ink font-bold text-lg mb-1.5">{current.title}</p>
            <p className="text-ink-muted text-sm leading-relaxed mb-6 whitespace-pre-line">{current.body}</p>
            <Button fullWidth onClick={dismiss} loading={dismissing}>
              Got it
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
