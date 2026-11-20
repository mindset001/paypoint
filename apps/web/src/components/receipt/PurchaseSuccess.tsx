'use client';
import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PurchaseSuccessProps {
  reference: string;
  title?: string;
  subtitle?: string;
  onDone: () => void;
  children?: ReactNode;
}

export function PurchaseSuccess({ reference, title = 'Payment Successful!', subtitle, onDone, children }: PurchaseSuccessProps) {
  const router = useRouter();

  return (
    <div className="px-5 pt-12 md:pt-8 pb-8 flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-500/15 rounded-full flex items-center justify-center">
        <CheckCircle size={32} className="text-green-600" />
      </div>
      <h2 className="text-xl font-black text-ink">{title}</h2>
      {subtitle && <p className="text-ink-muted text-sm -mt-2">{subtitle}</p>}
      {children}
      <div className="w-full flex flex-col gap-2 mt-2">
        <Button fullWidth size="lg" variant="secondary" onClick={() => router.push(`/receipt/${reference}`)}>
          View Receipt
        </Button>
        <Button fullWidth size="lg" onClick={onDone}>Back to Home</Button>
      </div>
    </div>
  );
}
