import { useEffect, useRef } from 'react';

export const ADMIN_AUTO_REFRESH_MS = 60_000;

// Re-runs `callback` on an interval, paused while the browser tab is
// hidden (no point polling admin data nobody's looking at, and it just
// burns API calls) and fired immediately when the tab becomes visible
// again, in case it's been a while since the last poll.
export function useAutoRefresh(callback: () => void, intervalMs: number = ADMIN_AUTO_REFRESH_MS) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (intervalId) return;
      intervalId = setInterval(() => callbackRef.current(), intervalMs);
    };
    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        callbackRef.current();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [intervalMs]);
}
