'use client';
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Megaphone, Send, Bell, MonitorSmartphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

type DisplayType = 'notification' | 'popup';

interface AnnouncementRow {
  _id: string;
  title: string;
  body: string;
  displayType: DisplayType;
  recipientCount: number;
  sentBy?: { firstName: string; lastName: string } | null;
  createdAt: string;
}

const DISPLAY_OPTIONS: { value: DisplayType; label: string; sub: string; icon: typeof Bell }[] = [
  { value: 'notification', label: 'Notification', sub: 'Shows in the bell icon list only', icon: Bell },
  { value: 'popup', label: 'Pop-up', sub: 'Blocking modal on next app open, until dismissed', icon: MonitorSmartphone },
];

export default function AnnouncementsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [displayType, setDisplayType] = useState<DisplayType>('notification');
  const [sending, setSending] = useState(false);

  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.announcements({ page, limit: 20 })
      .then((r) => {
        setRows(r.data.data.items);
        setTotal(r.data.data.total);
        setPages(r.data.data.pages);
      })
      .catch((e) => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const onSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSending(true);
    try {
      const r = await adminApi.sendAnnouncement({ title: title.trim(), body: body.trim(), displayType });
      toast.success(`Sent to ${r.data.data.recipientCount.toLocaleString()} users`);
      setTitle('');
      setBody('');
      setDisplayType('notification');
      setPage(1);
      load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-black">Announcements</h1>
        <p className="text-slate-400 text-sm mt-0.5">Broadcast a message to every active user</p>
      </div>

      {/* Compose */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-brand-blue/10 border border-brand-blue/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Megaphone size={18} className="text-brand-blue" />
          </div>
          <div>
            <p className="text-white font-semibold">New Announcement</p>
            <p className="text-slate-500 text-xs mt-0.5">Sent to every non-suspended user</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scheduled maintenance tonight"
              maxLength={120}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue/60 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1.5">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What do you want users to know?"
              rows={4}
              maxLength={500}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue/60 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1.5">How should it show?</label>
            <div className="grid grid-cols-2 gap-2">
              {DISPLAY_OPTIONS.map(({ value, label, sub, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDisplayType(value)}
                  className={`flex flex-col gap-1.5 text-left px-4 py-3 rounded-xl border transition-colors ${
                    displayType === value
                      ? 'bg-brand-blue/10 border-brand-blue text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon size={16} className={displayType === value ? 'text-brand-blue' : 'text-slate-500'} />
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-xs text-slate-500">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={onSend} disabled={sending}
            className="mt-1 w-full flex items-center justify-center gap-2 bg-brand-blue text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <Send size={15} />
            {sending ? 'Sending…' : 'Send Announcement'}
          </button>
        </div>
      </div>

      {/* History */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-white font-semibold">History</p>
        <p className="text-slate-500 text-sm">{total.toLocaleString()} sent</p>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="hidden lg:grid grid-cols-[140px_1fr_110px_90px_140px] gap-4 px-5 py-3 border-b border-slate-700/50">
          {['Date', 'Title', 'Type', 'Reach', 'Sent by'].map((h) => (
            <p key={h} className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{h}</p>
          ))}
        </div>

        {loading && (
          <div className="divide-y divide-slate-700/30">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-5 py-3 flex gap-4 animate-pulse">
                <div className="h-3 bg-slate-700 rounded w-24" />
                <div className="h-3 bg-slate-700/60 rounded flex-1" />
              </div>
            ))}
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Megaphone size={36} className="text-slate-600 mb-3" />
            <p className="text-slate-400 font-semibold">No announcements sent yet</p>
          </div>
        )}

        {!loading && rows.map((row) => (
          <div key={row._id}
            className="grid grid-cols-1 lg:grid-cols-[140px_1fr_110px_90px_140px] gap-1 lg:gap-4 items-center px-5 py-3.5 border-b border-slate-700/30">
            <p className="text-slate-500 text-xs">
              {new Date(row.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
              {' '}
              {new Date(row.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{row.title}</p>
              <p className="text-slate-500 text-xs truncate">{row.body}</p>
            </div>
            <span className={`w-fit text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border ${
              row.displayType === 'popup'
                ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                : 'bg-slate-600/20 text-slate-400 border-slate-600/40'
            }`}>
              {row.displayType === 'popup' ? 'Pop-up' : 'Notification'}
            </span>
            <p className="text-slate-300 text-sm">{row.recipientCount.toLocaleString()}</p>
            <p className="text-slate-400 text-sm truncate">
              {row.sentBy ? `${row.sentBy.firstName} ${row.sentBy.lastName}` : '—'}
            </p>
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-slate-500 text-sm">Page {page} of {pages} · {total.toLocaleString()} sent</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}
              className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={15} /> Prev
            </button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page === pages}
              className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
