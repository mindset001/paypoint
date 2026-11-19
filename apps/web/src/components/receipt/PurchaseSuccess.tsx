'use client';
import { useState, ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { walletApi } from '@/lib/api';
import { ReceiptModal } from './ReceiptModal';
import type { Transaction } from '@/types';

interface PurchaseSuccessProps {
  reference: string;
  title?: string;
  subtitle?: string;
  onDone: () => void;
  children?: ReactNode;
}

export function PurchaseSuccess({ reference, title = 'Payment Successful!', subtitle, onDone, children }: PurchaseSuccessProps) {
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  const viewReceipt = async () => {
    setLoadingReceipt(true);
    try {
      const { data } = await walletApi.transactionByReference(reference);
      setTx(data.data);
    } catch {
      toast.error('Could not load receipt');
    } finally {
      setLoadingReceipt(false);
    }
  };

  return (
    <div className="px-5 pt-12 md:pt-8 pb-8 flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-500/15 rounded-full flex items-center justify-center">
        <CheckCircle size={32} className="text-green-600" />
      </div>
      <h2 className="text-xl font-black text-ink">{title}</h2>
      {subtitle && <p className="text-ink-muted text-sm -mt-2">{subtitle}</p>}
      {children}
      <div className="w-full flex flex-col gap-2 mt-2">
        <Button fullWidth size="lg" variant="secondary" loading={loadingReceipt} onClick={viewReceipt}>
          View Receipt
        </Button>
        <Button fullWidth size="lg" onClick={onDone}>Back to Home</Button>
      </div>
      <AnimatePresence>
        {tx && <ReceiptModal tx={tx} onClose={() => setTx(null)} />}
      </AnimatePresence>
    </div>
  );
}
