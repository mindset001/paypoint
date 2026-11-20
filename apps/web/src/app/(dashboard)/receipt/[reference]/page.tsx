'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Share2, Download, Printer, Copy, Check,
  ArrowDownLeft, ArrowUpRight, Clock, X as XIcon, RotateCcw, Hash, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatNGN, formatDate, txTypeLabel, downloadBlob } from '@/lib/utils';
import { walletApi } from '@/lib/api';
import { SuccessBurst } from '@/components/illustrations/SuccessBurst';
import type { Transaction } from '@/types';

const DETAIL_ROWS = (tx: Transaction): { label: string; value: string }[] => {
  const m = tx.meta || {};
  const rows: { label: string; value: string }[] = [
    { label: 'Type', value: txTypeLabel[tx.type] ?? tx.type },
  ];
  if (m.phone) rows.push({ label: 'Phone Number', value: m.phone });
  if (m.network) rows.push({ label: 'Network', value: m.network });
  if (m.dataBundle) rows.push({ label: 'Bundle', value: m.dataBundle });
  if (m.cableProvider) rows.push({ label: 'Cable Provider', value: m.cableProvider });
  if (m.smartcardNumber) rows.push({ label: 'Smartcard No.', value: m.smartcardNumber });
  if (m.disco) rows.push({ label: 'Disco', value: m.disco });
  if (m.meterNumber) rows.push({ label: 'Meter Number', value: m.meterNumber });
  if (m.meterType) rows.push({ label: 'Meter Type', value: m.meterType });
  if (m.examType) rows.push({ label: 'Exam', value: m.examType });
  if (m.bankName) rows.push({ label: 'Bank', value: m.bankName });
  if (m.accountNumber) rows.push({ label: 'Account Number', value: m.accountNumber });
  if (m.counterpartyName) rows.push({ label: tx.direction === 'debit' ? 'Recipient' : 'From', value: m.counterpartyName });
  if (m.provider) rows.push({ label: 'Provider', value: m.provider.charAt(0).toUpperCase() + m.provider.slice(1) });
  if (m.channel) rows.push({ label: 'Channel', value: m.channel });
  if (tx.failureReason) rows.push({ label: 'Reason', value: tx.failureReason });
  return rows;
};

const STATUS_CONFIG: Record<string, { label: string; badge: string; ring: string }> = {
  success:  { label: 'Successful', badge: 'bg-green-50 text-green-600 dark:bg-green-500/15',   ring: 'ring-green-500/20' },
  pending:  { label: 'Pending',    badge: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-500/15', ring: 'ring-yellow-500/20' },
  failed:   { label: 'Failed',     badge: 'bg-red-50 text-red-500 dark:bg-red-500/15',          ring: 'ring-red-500/20' },
  reversed: { label: 'Reversed',   badge: 'bg-surface-2 text-ink-muted',                         ring: 'ring-line' },
};

function StatusHero({ tx }: { tx: Transaction }) {
  if (tx.status === 'success') return <SuccessBurst size={64} />;
  const isCredit = tx.direction === 'credit';
  if (tx.status === 'pending') {
    return (
      <div className="w-16 h-16 rounded-full bg-yellow-50 dark:bg-yellow-500/15 flex items-center justify-center">
        <Clock size={28} className="text-yellow-600" />
      </div>
    );
  }
  if (tx.status === 'reversed') {
    return (
      <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center">
        <RotateCcw size={28} className="text-ink-muted" />
      </div>
    );
  }
  return (
    <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/15 flex items-center justify-center">
      {isCredit ? <ArrowDownLeft size={28} className="text-red-500" /> : <XIcon size={28} className="text-red-500" />}
    </div>
  );
}

export default function ReceiptPage() {
  const params = useParams<{ reference: string }>();
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [exporting, setExporting] = useState<'share' | 'download' | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    walletApi.transactionByReference(params.reference)
      .then(({ data }) => setTx(data.data))
      .catch(() => setErr('Receipt not found'))
      .finally(() => setLoading(false));
  }, [params.reference]);

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
      const file = new File([blob], `Paycen-Receipt-${tx?.reference}.png`, { type: 'image/png' });
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
      if (blob) downloadBlob(blob, `Paycen-Receipt-${tx?.reference}.png`);
    } finally { setExporting(null); }
  };

  const copyReference = () => {
    if (!tx) return;
    navigator.clipboard.writeText(tx.reference);
    setCopied(true);
    toast.success('Reference copied');
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-canvas relative overflow-hidden">
      {/* Decorative background — kept soft and away from the card's center
          so it doesn't bleed into the divider notch cutouts below. */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-green-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top bar */}
      <div className="relative px-4 pt-14 md:pt-8 pb-2 flex items-center gap-3 print:hidden">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center text-ink-muted hover:text-ink transition-colors">
          <ArrowLeft size={17} />
        </button>
        <h1 className="text-ink font-bold text-base">Receipt</h1>
      </div>

      <div className="relative px-5 py-6 flex flex-col items-center">
        {loading && (
          <div className="w-full max-w-sm bg-surface rounded-3xl shadow-xl p-8 flex flex-col items-center gap-4 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-surface-2" />
            <div className="h-8 w-40 bg-surface-2 rounded-lg" />
            <div className="h-4 w-24 bg-surface-2 rounded-full" />
          </div>
        )}

        {!loading && err && (
          <div className="w-full max-w-sm bg-surface rounded-3xl shadow-xl p-8 flex flex-col items-center gap-3 text-center">
            <p className="text-ink font-bold">Receipt not found</p>
            <p className="text-ink-muted text-sm">This transaction reference doesn&apos;t exist or isn&apos;t yours.</p>
          </div>
        )}

        {!loading && tx && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="w-full max-w-sm"
            >
              {/* Captured card */}
              <div ref={cardRef} className="bg-surface rounded-t-3xl shadow-xl overflow-hidden">
                {/* Brand header */}
                <div className="flex justify-center pt-6 pb-4">
                  <div className="bg-white rounded-xl px-3 py-1.5 shadow-sm">
                    <img src="/icons/wordmark.png" alt="Paycen" width={100} height={26} />
                  </div>
                </div>

                {/* Status hero */}
                <div className="flex flex-col items-center px-6 pb-6">
                  <StatusHero tx={tx} />
                  <p className={cn('mt-4 text-3xl font-black tracking-tight',
                    tx.direction === 'credit' && tx.status === 'success' ? 'text-green-600' : 'text-ink')}>
                    {tx.direction === 'credit' ? '+' : '−'}{formatNGN(tx.amount)}
                  </p>
                  <span className={cn('mt-2 text-xs font-bold px-3 py-1 rounded-full', STATUS_CONFIG[tx.status]?.badge ?? 'bg-surface-2 text-ink-muted')}>
                    {STATUS_CONFIG[tx.status]?.label ?? tx.status}
                  </span>
                  <p className="text-ink-muted text-xs mt-3 flex items-center gap-1.5">
                    <Calendar size={12} /> {formatDate(tx.createdAt)}
                  </p>
                </div>

                {/* Perforated divider */}
                <div className="relative px-0">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-canvas rounded-full" />
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-canvas rounded-full" />
                  <div className="border-t-2 border-dashed border-line mx-6" />
                </div>

                {/* Meter token / special payload */}
                {tx.meta?.token && (
                  <div className="mx-6 mt-5 bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-2xl p-4">
                    <p className="text-xs text-ink-muted mb-1">Meter Token</p>
                    <p className="text-xl font-black text-orange-600 tracking-widest break-all">{tx.meta.token}</p>
                    {tx.meta.units && <p className="text-sm text-ink-muted mt-1">{tx.meta.units} units</p>}
                  </div>
                )}

                {/* Details */}
                <div className="px-6 py-5 flex flex-col gap-3">
                  {DETAIL_ROWS(tx).map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-start gap-4 text-sm">
                      <span className="text-ink-muted flex-shrink-0">{label}</span>
                      <span className="text-ink font-semibold text-right break-all">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Reference strip */}
                <button onClick={copyReference} className="w-full flex items-center justify-between gap-3 px-6 py-4 bg-surface-2 border-t border-line hover:bg-line/40 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <Hash size={14} className="text-ink-muted flex-shrink-0" />
                    <span className="font-mono text-xs text-ink-muted truncate">{tx.reference}</span>
                  </div>
                  {copied ? <Check size={14} className="text-green-600 flex-shrink-0" /> : <Copy size={14} className="text-ink-muted flex-shrink-0" />}
                </button>
              </div>
              {/* Jagged bottom edge, like a torn receipt */}
              <div
                className="h-3 w-full bg-surface"
                style={{
                  clipPath: 'polygon(0% 0%, 4% 100%, 8% 0%, 12% 100%, 16% 0%, 20% 100%, 24% 0%, 28% 100%, 32% 0%, 36% 100%, 40% 0%, 44% 100%, 48% 0%, 52% 100%, 56% 0%, 60% 100%, 64% 0%, 68% 100%, 72% 0%, 76% 100%, 80% 0%, 84% 100%, 88% 0%, 92% 100%, 96% 0%, 100% 100%, 100% 0%)',
                }}
              />
            </motion.div>

            {/* Actions */}
            <div className="w-full max-w-sm mt-6 flex flex-col gap-2 print:hidden">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleShare}
                  disabled={exporting !== null}
                  className="flex items-center justify-center gap-2 bg-brand-blue text-white font-semibold py-3.5 rounded-2xl text-sm shadow-lg shadow-blue-500/20 disabled:opacity-60 active:scale-[0.98] transition-transform"
                >
                  <Share2 size={16} /> {exporting === 'share' ? 'Preparing…' : 'Share'}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={exporting !== null}
                  className="flex items-center justify-center gap-2 bg-surface border border-line text-ink font-semibold py-3.5 rounded-2xl text-sm hover:bg-surface-2 transition-colors disabled:opacity-60"
                >
                  <Download size={16} /> {exporting === 'download' ? 'Saving…' : 'Save Image'}
                </button>
              </div>
              <button
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 text-ink-muted font-medium py-2.5 rounded-2xl text-xs hover:bg-surface-2 transition-colors"
              >
                <Printer size={14} /> Print Receipt
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
