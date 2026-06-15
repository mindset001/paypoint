'use client';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatNGN, formatDate, txTypeLabel } from '@/lib/utils';
import type { Transaction } from '@/types';
import { cn } from '@/lib/cn';

export function TransactionItem({ tx }: { tx: Transaction }) {
  const isCredit = tx.direction === 'credit';
  const statusColors = {
    success: 'text-green-600',
    failed: 'text-red-500',
    pending: 'text-yellow-500',
    reversed: 'text-gray-500',
  };

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
        isCredit ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
      )}>
        {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{txTypeLabel[tx.type] ?? tx.type}</p>
        <p className="text-xs text-gray-400 truncate">{formatDate(tx.createdAt)}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={cn('text-sm font-bold', isCredit ? 'text-green-600' : 'text-gray-900')}>
          {isCredit ? '+' : '-'}{formatNGN(tx.amount)}
        </p>
        <p className={cn('text-xs capitalize', statusColors[tx.status])}>{tx.status}</p>
      </div>
    </div>
  );
}
