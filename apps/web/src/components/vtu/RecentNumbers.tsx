'use client';
import { useState, useEffect } from 'react';
import { vtuApi } from '@/lib/api';

interface RecentNumber { phone: string; network: string; isSelf: boolean }

export function RecentNumbers({ onSelect }: { onSelect: (phone: string, network: string) => void }) {
  const [recent, setRecent] = useState<RecentNumber[]>([]);

  useEffect(() => {
    vtuApi.recentNumbers().then(({ data }) => setRecent(data.data || [])).catch(() => setRecent([]));
  }, []);

  if (recent.length === 0) return null;

  return (
    <div>
      <label className="text-sm font-medium text-ink-muted mb-2 block">Recent Numbers</label>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
        {recent.map((r) => (
          <button type="button" key={r.phone} onClick={() => onSelect(r.phone, r.network)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              {r.isSelf ? 'Me' : r.phone.slice(-4)}
            </div>
            <span className="text-xs text-ink-muted text-center leading-tight truncate w-full">
              {r.isSelf ? 'Me' : r.phone.slice(0, 5)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
