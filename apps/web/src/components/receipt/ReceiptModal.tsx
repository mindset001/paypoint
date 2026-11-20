'use client';
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Printer, Share2, Download, ArrowDownLeft, ArrowUpRight, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { formatNGN, formatDate, txTypeLabel } from '@/lib/utils';
import type { Transaction } from '@/types';

const statusStyle: Record<string, string> = {
  success: 'text-green-600 bg-green-50 dark:bg-green-500/15',
  pending: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-500/15',
  failed:  'text-red-500 bg-red-50 dark:bg-red-500/15',
  reversed:'text-ink-muted bg-surface-2',
};

export function ReceiptModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const isCredit = tx.direction === 'credit';
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<'share' | 'download' | null>(null);

  const captureCard = async () => {
    if (!cardRef.current) return null;
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
    return new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  };

  const handleShare = async () => {
    setExporting('share');
    try {
      const blob = await captureCard();
      if (!blob) return;
      const file = new File([blob], `Paycen-Receipt-${tx.reference}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Paycen Receipt' }).catch(() => {});
      } else {
        downloadBlob(blob, file.name);
      }
    } finally { setExporting(null); }
  };

  const handleDownload = async () => {
    setExporting('download');
    try {
      const blob = await captureCard();
      if (blob) downloadBlob(blob, `Paycen-Receipt-${tx.reference}.png`);
    } finally { setExporting(null); }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="bg-surface rounded-3xl w-full max-w-sm shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-line">
          <h2 className="font-black text-ink">Transaction Receipt</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-2 text-ink-muted">
            <X size={16} />
          </button>
        </div>

        {/* Captured content */}
        <div ref={cardRef} className="bg-surface">
          <div className="flex items-center justify-center gap-2 pt-5 pb-1">
            <div className="w-6 h-6 rounded-lg bg-brand-blue flex items-center justify-center">
              <span className="text-white text-xs font-black">P</span>
            </div>
            <span className="font-black text-ink text-sm">Paycen</span>
          </div>

          {/* Amount badge */}
          <div className="flex flex-col items-center py-5">
            <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center mb-3',
              isCredit ? 'bg-green-100 dark:bg-green-500/15 text-green-600' : 'bg-red-100 dark:bg-red-500/15 text-red-500')}>
              {isCredit ? <ArrowDownLeft size={28} /> : <ArrowUpRight size={28} />}
            </div>
            <p className={cn('text-3xl font-black', isCredit ? 'text-green-600' : 'text-ink')}>
              {isCredit ? '+' : '-'}{formatNGN(tx.amount)}
            </p>
            <span className={cn('mt-2 text-xs font-semibold px-3 py-1 rounded-full capitalize', statusStyle[tx.status] ?? 'bg-surface-2 text-ink-muted')}>
              {tx.status}
            </span>
          </div>

          {tx.meta?.token && (
            <div className="mx-5 mb-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-2xl p-4">
              <p className="text-xs text-ink-muted mb-1">Meter Token</p>
              <p className="text-xl font-black text-orange-600 tracking-widest break-all">{tx.meta.token}</p>
              {tx.meta.units && <p className="text-sm text-ink-muted mt-1">{tx.meta.units} units</p>}
              <button
                onClick={() => { navigator.clipboard.writeText(tx.meta!.token!); toast.success('Token copied!'); }}
                className="flex items-center gap-1 text-xs text-orange-500 mt-2"
              >
                <Copy size={12} /> Copy token
              </button>
            </div>
          )}

          {/* Details */}
          <div className="px-5 pb-5 flex flex-col gap-2 text-sm">
            {[
              ['Type',        txTypeLabel[tx.type] ?? tx.type],
              ['Reference',   tx.reference],
              ['Date',        formatDate(tx.createdAt)],
              ...(tx.meta?.phone    ? [['Phone',    tx.meta.phone]]    : []),
              ...(tx.meta?.network  ? [['Network',  tx.meta.network]]  : []),
              ...(tx.meta?.provider ? [['Provider', tx.meta.provider]] : []),
              ...(tx.failureReason  ? [['Reason',   tx.failureReason]] : []),
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-start gap-2">
                <span className="text-ink-muted flex-shrink-0">{label}</span>
                <span className="text-ink font-medium text-right break-all">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleShare}
              disabled={exporting !== null}
              className="flex items-center justify-center gap-2 bg-brand-blue text-white font-semibold py-3 rounded-2xl text-sm disabled:opacity-60"
            >
              <Share2 size={16} /> {exporting === 'share' ? 'Preparing...' : 'Share'}
            </button>
            <button
              onClick={handleDownload}
              disabled={exporting !== null}
              className="flex items-center justify-center gap-2 border border-line text-ink-muted font-semibold py-3 rounded-2xl text-sm hover:bg-surface-2 transition-colors disabled:opacity-60"
            >
              <Download size={16} /> {exporting === 'download' ? 'Saving...' : 'Save Image'}
            </button>
          </div>
          <button
            onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 text-ink-muted font-medium py-2 rounded-2xl text-xs hover:bg-surface-2 transition-colors"
          >
            <Printer size={14} /> Print Receipt
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
