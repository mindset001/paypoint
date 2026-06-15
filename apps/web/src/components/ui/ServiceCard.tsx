'use client';
import Link from 'next/link';
import { Phone, Wifi, Tv, Zap, BookOpen, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

const icons: Record<string, LucideIcon> = {
  phone: Phone,
  wifi: Wifi,
  tv: Tv,
  zap: Zap,
  book: BookOpen,
};

const colors: Record<string, string> = {
  airtime: 'bg-yellow-50 text-yellow-600',
  data: 'bg-blue-50 text-blue-600',
  cable: 'bg-purple-50 text-purple-600',
  electricity: 'bg-orange-50 text-orange-600',
  exam: 'bg-green-50 text-green-600',
};

interface ServiceCardProps {
  id: string;
  name: string;
  icon: string;
}

export function ServiceCard({ id, name, icon }: ServiceCardProps) {
  const Icon = icons[icon] ?? Phone;
  return (
    <Link
      href={`/${id}`}
      className={cn(
        'flex flex-col items-center gap-2 p-3 rounded-2xl bg-white transition-all duration-200',
        'hover:shadow-lg active:scale-95',
      )}
      style={{ perspective: '400px' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'perspective(400px) rotateX(-6deg) translateY(-4px) scale(1.04)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 30px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
      }}
    >
      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', colors[id] ?? 'bg-gray-100 text-gray-600')}>
        <Icon size={22} />
      </div>
      <span className="text-xs font-medium text-gray-700 text-center leading-tight">{name}</span>
    </Link>
  );
}
