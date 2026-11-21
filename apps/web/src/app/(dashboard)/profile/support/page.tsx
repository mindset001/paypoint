'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, Mail, MessageCircle, Phone, Headphones, Lightbulb, ExternalLink, Crown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { servicesApi } from '@/lib/api';

const WHATSAPP_NUMBER = '2348160071243';
const SUPPORT_EMAIL = 'smademola01@gmail.com';
const SUPPORT_PHONE = '+2348160071243';

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
    q: 'Can I withdraw money to my bank account?',
    a: 'Bank withdrawals are coming soon — currently, transfers are between Paycen wallets only.',
  },
  {
    q: 'Is my money safe on Paycen?',
    a: 'Yes. Paycen operates within CBN guidelines. Funds in your wallet are held in a dedicated escrow account and are not used for any other purpose.',
  },
  {
    q: 'How do I verify my account (KYC)?',
    a: 'KYC verification is coming soon. Once available, you\'ll be able to verify your identity to unlock higher transaction limits.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <span className="text-sm font-semibold text-ink flex-1">{q}</span>
        <ChevronDown
          size={16}
          className={cn('text-ink-muted flex-shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <p className="text-sm text-ink-muted leading-relaxed px-4 pb-4">{a}</p>
      )}
    </div>
  );
}

type FeatureStatus = 'live' | 'coming_soon' | 'hidden';

export default function SupportPage() {
  const router = useRouter();
  // Default matches the API's own default so there's no flash before the
  // real flag loads.
  const [resellerStatus, setResellerStatus] = useState<FeatureStatus>('coming_soon');

  useEffect(() => {
    servicesApi.features().then((r) => setResellerStatus(r.data.data.reseller)).catch(() => {});
  }, []);

  return (
    <div>
      <div className="px-4 pt-14 md:pt-8 pb-2 flex items-center justify-center relative">
        <button onClick={() => router.back()} className="absolute left-4 text-ink">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-ink text-lg font-bold">Help &amp; support</h1>
      </div>

      <div className="px-4 py-5 flex flex-col gap-4">
        {/* Hero */}
        <div className="bg-gradient-to-br from-brand-dark to-brand-navy rounded-3xl p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-white text-xl font-black mb-1">We&apos;re here to help</h2>
            <p className="text-blue-200 text-sm leading-relaxed">
              Questions, failed payments or wallet funding: email Paycen support, or reach the team on WhatsApp.
            </p>
          </div>
          <a href={`mailto:${SUPPORT_EMAIL}`}
            className="bg-white text-ink font-bold text-sm rounded-2xl py-3.5 flex items-center justify-center gap-2 hover:bg-gray-100 active:scale-[0.98] transition-all">
            <Headphones size={18} /> Chat with us now
          </a>
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
            className="bg-green-500 text-white font-bold text-sm rounded-2xl py-3.5 flex items-center justify-center gap-2 hover:bg-green-600 active:scale-[0.98] transition-all">
            <MessageCircle size={18} /> Chat on WhatsApp
          </a>
        </div>

        <div className="flex items-start gap-2 px-1">
          <Lightbulb size={16} className="text-ink-muted flex-shrink-0 mt-0.5" />
          <p className="text-xs text-ink-muted leading-relaxed">
            About a payment? Send the reference from its receipt so we can find it quickly.
          </p>
        </div>

        {/* Contact channels */}
        <div>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3 px-1">
            Other ways to reach us
          </p>
          <div className="bg-surface rounded-2xl border border-line">
            {[
              { icon: Phone, label: 'Call us', sub: SUPPORT_PHONE, color: 'bg-blue-50 dark:bg-blue-500/10 text-brand-blue', href: `tel:${SUPPORT_PHONE}` },
              { icon: Mail, label: 'Email', sub: SUPPORT_EMAIL, color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600', href: `mailto:${SUPPORT_EMAIL}` },
            ].map(({ icon: Icon, label, sub, color, href }) => (
              <a key={label} href={href}
                className="flex items-center gap-3 p-4 border-b border-line last:border-0 hover:bg-surface-2 transition-colors">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink">{label}</p>
                  <p className="text-xs text-ink-muted truncate">{sub}</p>
                </div>
                <ExternalLink size={16} className="text-ink-muted flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <p className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3 px-1">
            Frequently Asked Questions
          </p>
          <div className="bg-surface rounded-2xl border border-line">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} {...faq} />
            ))}
          </div>
        </div>

        {/* Become a reseller — visibility controlled by Admin > Settings; not rendered at all when hidden */}
        {resellerStatus !== 'hidden' && (
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-xs font-bold text-ink-muted uppercase tracking-widest">Become a Reseller</p>
              {resellerStatus === 'coming_soon' && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              )}
            </div>
            {resellerStatus === 'live' ? (
              <div className="bg-surface rounded-2xl border border-line p-6 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Crown size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">Sell to your own customers</p>
                  <p className="text-xs text-ink-muted leading-relaxed max-w-xs mt-1">
                    Message us on WhatsApp to apply — our team reviews and upgrades your account.
                  </p>
                </div>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi, I'd like to become a Paycen reseller.")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full bg-teal-600 text-white font-bold text-sm rounded-2xl py-3.5 flex items-center justify-center gap-2 hover:bg-teal-700 active:scale-[0.98] transition-all">
                  <MessageCircle size={18} /> Apply on WhatsApp
                </a>
              </div>
            ) : (
              <div className="bg-surface rounded-2xl border border-line p-6 flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Crown size={22} />
                </div>
                <p className="text-sm font-bold text-ink">Reseller program coming soon</p>
                <p className="text-xs text-ink-muted leading-relaxed max-w-xs">
                  We&apos;re reworking how the reseller program works. Check back soon.
                </p>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-ink-muted/70 pb-2">
          Paycen Support · Available 24/7
        </p>
      </div>
    </div>
  );
}
