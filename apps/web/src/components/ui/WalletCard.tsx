'use client';
import { useState, useRef } from 'react';
import { Eye, EyeOff, Plus, ArrowUpRight } from 'lucide-react';
import { formatNGN } from '@/lib/utils';
import type { Wallet } from '@/types';
import Link from 'next/link';

interface WalletCardProps {
  wallet: Wallet | null;
  loading?: boolean;
}

export function WalletCard({ wallet, loading }: WalletCardProps) {
  const [visible, setVisible] = useState(true);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setTilt({
      x: ((y - cy) / cy) * -12,
      y: ((x - cx) / cx) * 14,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setHovered(false);
  };

  return (
    <div
      className="perspective-800"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={cardRef}
        className="preserve-3d relative rounded-3xl overflow-hidden bg-gradient-to-br from-brand-blue via-blue-600 to-blue-800 p-6 text-white shadow-xl"
        style={{
          transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${hovered ? 'scale(1.02)' : 'scale(1)'}`,
          transition: hovered ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out',
          boxShadow: hovered
            ? `${-tilt.y * 1.5}px ${tilt.x * 1.5}px 40px rgba(37,99,235,0.45), 0 20px 60px rgba(0,0,0,0.25)`
            : '0 10px 40px rgba(37,99,235,0.25)',
        }}
      >
        {/* Shiny gloss layer */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${50 + tilt.y * 2}% ${50 + tilt.x * 2}%, rgba(255,255,255,0.18) 0%, transparent 65%)`,
            opacity: hovered ? 1 : 0,
          }}
        />

        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 right-4 w-20 h-20 bg-white/5 rounded-full -translate-y-1/2" />

        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-blue-100 text-sm font-medium tracking-wide">Wallet Balance</span>
            <button
              onClick={() => setVisible(!visible)}
              className="text-blue-200 hover:text-white transition-colors"
            >
              {visible ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          <div className="mb-6">
            {loading ? (
              <div className="h-9 w-40 bg-white/20 animate-pulse rounded-lg" />
            ) : (
              <p className="text-3xl font-bold tracking-tight">
                {visible ? formatNGN(wallet?.balance ?? 0) : '₦ •••••'}
              </p>
            )}
            <p className="text-blue-200 text-xs mt-1 capitalize">{wallet?.tier ?? 'basic'} account</p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/wallet/fund"
              className="flex items-center gap-1.5 bg-white text-brand-blue px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors"
            >
              <Plus size={16} />
              Fund
            </Link>
            <Link
              href="/wallet/transfer"
              className="flex items-center gap-1.5 bg-white/20 text-white border border-white/30 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/30 transition-colors"
            >
              <ArrowUpRight size={16} />
              Transfer
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
