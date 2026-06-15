'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Bell, BellOff, CheckCheck,
  ArrowLeftRight, Shield, Tag, Info, Wallet,
  RefreshCw,
} from 'lucide-react';
import { notificationsApi } from '@/lib/api';
import type { Notification } from '@/types';

const TYPE_CONFIG = {
  transaction: { icon: ArrowLeftRight, bg: 'bg-blue-50',   text: 'text-blue-600'   },
  wallet:      { icon: Wallet,         bg: 'bg-green-50',  text: 'text-green-600'  },
  security:    { icon: Shield,         bg: 'bg-red-50',    text: 'text-red-600'    },
  promo:       { icon: Tag,            bg: 'bg-purple-50', text: 'text-purple-600' },
  system:      { icon: Info,           bg: 'bg-gray-50',   text: 'text-gray-500'   },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [total, setTotal]                 = useState(0);
  const [page, setPage]                   = useState(1);
  const [pages, setPages]                 = useState(1);
  const [filter, setFilter]               = useState<'all' | 'unread'>('all');
  const [loading, setLoading]             = useState(true);
  const [markingAll, setMarkingAll]       = useState(false);

  const load = useCallback((reset = false) => {
    const nextPage = reset ? 1 : page;
    if (reset) setPage(1);
    setLoading(true);
    notificationsApi.list({ page: nextPage, limit: 20, unread: filter === 'unread' || undefined })
      .then((r) => {
        const d = r.data.data;
        setNotifications(reset ? d.notifications : (prev) => [...prev, ...d.notifications]);
        setUnreadCount(d.unreadCount);
        setTotal(d.total);
        setPages(d.pages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filter]);

  useEffect(() => { load(true); }, [filter]);

  const markRead = async (id: string) => {
    const existing = notifications.find((n) => n._id === id);
    if (!existing || existing.read) return;
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
    notificationsApi.markRead(id).catch(() => {});
  };

  const markAll = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ } finally {
      setMarkingAll(false);
    }
  };

  const loadMore = () => {
    if (page < pages && !loading) {
      setPage((p) => p + 1);
      load();
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-b from-brand-dark to-brand-navy px-6 pt-14 lg:pt-8 pb-5 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.back()} className="text-white p-1 -ml-1">
            <ArrowLeft size={22} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAll}
              disabled={markingAll}
              className="flex items-center gap-1.5 text-blue-300 hover:text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <CheckCheck size={15} />
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <h1 className="text-white text-xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-white/10 rounded-xl p-1">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                filter === f
                  ? 'bg-white text-brand-dark shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {f}
              {f === 'unread' && unreadCount > 0 && ` (${unreadCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 px-4 py-4">
        {loading && notifications.length === 0 && (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 flex gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-50 rounded w-full" />
                  <div className="h-2 bg-gray-50 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-4">
              <BellOff size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold">
              {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {filter === 'unread'
                ? 'You have no unread notifications.'
                : 'Notifications will appear here when you make transactions.'}
            </p>
            {filter === 'unread' && (
              <button onClick={() => setFilter('all')} className="mt-4 text-brand-blue text-sm font-semibold">
                View all notifications
              </button>
            )}
          </div>
        )}

        {notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((n) => {
              const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system;
              const Icon = cfg.icon;
              return (
                <button
                  key={n._id}
                  onClick={() => markRead(n._id)}
                  className={`w-full text-left bg-white rounded-2xl p-4 flex gap-3 transition-all active:scale-[0.98] border ${
                    n.read ? 'border-transparent' : 'border-brand-blue/20 shadow-sm shadow-blue-500/5'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon size={18} className={cfg.text} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-tight ${n.read ? 'text-gray-700 font-medium' : 'text-gray-900 font-bold'}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="w-2 h-2 bg-brand-blue rounded-full shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-1 leading-relaxed">{n.body}</p>
                    <p className="text-gray-300 text-xs mt-1.5">{timeAgo(n.createdAt)}</p>
                  </div>
                </button>
              );
            })}

            {/* Load more */}
            {page < pages && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full py-3 text-brand-blue text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
                {loading ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        )}

        {/* Footer count */}
        {!loading && notifications.length > 0 && (
          <p className="text-center text-xs text-gray-300 mt-6 pb-4">
            Showing {notifications.length} of {total} notifications
          </p>
        )}
      </div>
    </div>
  );
}
