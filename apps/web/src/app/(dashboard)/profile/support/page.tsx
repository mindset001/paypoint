'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, Mail, MessageCircle, Phone } from 'lucide-react';
import { cn } from '@/lib/cn';

const FAQS = [
  {
    q: 'How do I fund my wallet?',
    a: 'Go to Wallet → Fund Wallet. You can pay via card, bank transfer, or USSD. Your wallet is credited instantly after a successful payment.',
  },
  {
    q: 'How long does airtime or data take to arrive?',
    a: 'Delivery is instant — usually within a few seconds of a successful transaction. If it takes longer, check your transaction history and contact support.',
  },
  {
    q: 'What happens if a transaction fails but my wallet was debited?',
    a: 'Your wallet is automatically refunded within minutes if the provider fails to deliver. You can also see the refund in your transaction history.',
  },
  {
    q: 'How do I reset my transaction PIN?',
    a: "Go to Profile → Security & PIN. You'll need your current PIN to change it. If you've forgotten it, contact support.",
  },
  {
    q: 'Can I transfer money to any bank account?',
    a: 'Currently, transfers are between PayPoint wallets only. Bank withdrawals are coming soon.',
  },
  {
    q: 'Is my money safe on PayPoint?',
    a: 'Yes. PayPoint operates within CBN guidelines. Funds in your wallet are held in a dedicated escrow account and are not used for any other purpose.',
  },
  {
    q: 'How do I verify my account (KYC)?',
    a: 'KYC verification is coming soon. Once available, you\'ll be able to verify your identity to unlock higher transaction limits.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-50 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <span className="text-sm font-semibold text-gray-900 flex-1">{q}</span>
        <ChevronDown
          size={16}
          className={cn('text-gray-400 flex-shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <p className="text-sm text-gray-500 leading-relaxed px-4 pb-4">{a}</p>
      )}
    </div>
  );
}

export default function SupportPage() {
  const router = useRouter();

  return (
    <div>
      <div className="bg-gradient-to-b from-brand-dark to-brand-navy px-6 pt-14 lg:pt-8 pb-6">
        <button onClick={() => router.back()} className="text-white mb-4">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-xl font-bold">Help & Support</h1>
        <p className="text-blue-300 text-sm mt-1">We&apos;re here to help</p>
      </div>

      <div className="px-4 py-5 flex flex-col gap-4">
        {/* Contact channels */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: MessageCircle, label: 'WhatsApp', sub: 'Chat now', color: 'bg-green-50 text-green-600', href: 'https://wa.me/2348000000000' },
            { icon: Mail, label: 'Email', sub: 'support@paypoint.ng', color: 'bg-blue-50 text-brand-blue', href: 'mailto:support@paypoint.ng' },
            { icon: Phone, label: 'Call', sub: '0800-PAYPOINT', color: 'bg-orange-50 text-orange-600', href: 'tel:08000000000' },
          ].map(({ icon: Icon, label, sub, color, href }) => (
            <a
              key={label}
              href={href}
              className="bg-white border border-gray-100 rounded-2xl p-3 flex flex-col items-center gap-2 hover:shadow-md active:scale-95 transition-all"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={18} />
              </div>
              <p className="text-xs font-bold text-gray-900">{label}</p>
              <p className="text-xs text-gray-400 text-center leading-tight">{sub}</p>
            </a>
          ))}
        </div>

        {/* FAQ */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
            Frequently Asked Questions
          </p>
          <div className="bg-white rounded-2xl border border-gray-100">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} {...faq} />
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 pb-2">
          PayPoint Support · Available 24/7
        </p>
      </div>
    </div>
  );
}
