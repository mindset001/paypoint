'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Building2, Copy, CheckCircle, ChevronRight, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { walletApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/cn';

type Provider = 'paystack' | 'flutterwave' | 'monnify';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

const PROVIDERS: { id: Provider; name: string; tagline: string; methods: string[]; logo: string }[] = [
  {
    id: 'paystack',
    name: 'Paystack',
    tagline: 'Card, bank transfer, USSD',
    methods: ['Visa', 'Mastercard', 'Bank transfer', 'USSD'],
    logo: '💳',
  },
  {
    id: 'flutterwave',
    name: 'Flutterwave',
    tagline: 'Card, bank transfer, USSD',
    methods: ['Visa', 'Mastercard', 'Bank transfer', 'USSD'],
    logo: '🦋',
  },
  {
    id: 'monnify',
    name: 'Monnify',
    tagline: 'Bank transfer · instant',
    methods: ['Bank transfer', 'Card'],
    logo: '🏦',
  },
];

interface VirtualAccount {
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
}

export default function FundWalletPage() {
  const router  = useRouter();
  const { user } = useAuthStore();

  const [amount,       setAmount]       = useState('');
  const [provider,     setProvider]     = useState<Provider>('paystack');
  const [loading,      setLoading]      = useState(false);
  const [vaLoading,    setVaLoading]    = useState(false);
  const [virtualAcct,  setVirtualAcct]  = useState<VirtualAccount | null>(null);
  const [copied,       setCopied]       = useState(false);

  const handleFund = async () => {
    const val = parseFloat(amount);
    if (!val || val < 100) { toast.error('Minimum amount is ₦100'); return; }
    setLoading(true);
    try {
      const { data } = await walletApi.fund(val, provider);
      window.location.href = data.data.authorizationUrl;
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadVirtualAccount = async () => {
    setVaLoading(true);
    try {
      const { data } = await walletApi.virtualAccount();
      setVirtualAcct(data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setVaLoading(false);
    }
  };

  const copyAcctNumber = () => {
    if (!virtualAcct) return;
    navigator.clipboard.writeText(virtualAcct.accountNumber).then(() => {
      setCopied(true);
      toast.success('Account number copied!');
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-blue to-blue-700 px-6 pt-14 lg:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-2xl font-black">Fund Wallet</h1>
        <p className="text-blue-100 text-sm mt-1">Choose your preferred payment method</p>
      </div>

      <div className="px-5 -mt-4 pb-10 space-y-4">

        {/* Amount card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Amount (₦)</p>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {QUICK_AMOUNTS.map((a) => (
              <button key={a} onClick={() => setAmount(a.toString())}
                className={cn(
                  'py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95',
                  amount === a.toString()
                    ? 'border-brand-blue bg-blue-50 text-brand-blue'
                    : 'border-gray-100 text-gray-600 bg-gray-50 hover:border-gray-200',
                )}>
                ₦{a.toLocaleString()}
              </button>
            ))}
          </div>

          <Input
            placeholder="Or enter custom amount"
            type="number"
            min={100}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {/* Provider selection */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Payment provider</p>

          <div className="space-y-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => { setProvider(p.id); setVirtualAcct(null); }}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left',
                  provider === p.id
                    ? 'border-brand-blue bg-blue-50/50'
                    : 'border-gray-100 hover:border-gray-200 bg-gray-50/50',
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl shrink-0">
                  {p.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-bold text-sm', provider === p.id ? 'text-brand-blue' : 'text-gray-900')}>
                    {p.name}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">{p.tagline}</p>
                </div>
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                  provider === p.id ? 'border-brand-blue bg-brand-blue' : 'border-gray-200',
                )}>
                  {provider === p.id && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Monnify virtual account panel */}
        {provider === 'monnify' && (
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={16} className="text-brand-blue" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Your Virtual Account</p>
            </div>

            {!virtualAcct ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-4">
                  Get a dedicated bank account number. Transfer any amount anytime and your wallet is credited instantly.
                </p>
                <button
                  onClick={loadVirtualAccount}
                  disabled={vaLoading}
                  className="flex items-center gap-2 mx-auto text-brand-blue font-semibold text-sm bg-blue-50 hover:bg-blue-100 px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {vaLoading ? <RefreshCw size={14} className="animate-spin" /> : <Building2 size={14} />}
                  {vaLoading ? 'Generating…' : 'Get Virtual Account'}
                </button>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-brand-blue to-blue-700 rounded-2xl p-5 text-white">
                <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">Account name</p>
                <p className="font-bold text-base mb-4">{virtualAcct.accountName}</p>

                <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">Account number</p>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-2xl font-black tracking-widest">{virtualAcct.accountNumber}</p>
                  <button onClick={copyAcctNumber}
                    className="bg-white/20 hover:bg-white/30 p-1.5 rounded-lg transition-colors">
                    {copied
                      ? <CheckCircle size={16} className="text-green-300" />
                      : <Copy size={16} />}
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-white/20 pt-3">
                  <div>
                    <p className="text-blue-200 text-xs">Bank</p>
                    <p className="font-semibold text-sm">{virtualAcct.bankName}</p>
                  </div>
                  <span className="text-xs bg-green-400/20 text-green-300 border border-green-400/30 px-2 py-0.5 rounded-full font-semibold">
                    Instant credit
                  </span>
                </div>
              </div>
            )}

            {virtualAcct && (
              <p className="text-gray-400 text-xs text-center mt-3">
                Transfer any amount to this account — no need to press &quot;Pay&quot; below.
              </p>
            )}
          </div>
        )}

        {/* Info */}
        <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-400 space-y-1.5 border border-gray-100">
          <div className="flex items-center gap-2">
            <CreditCard size={13} className="text-gray-400 shrink-0" />
            <p>All payments are secured by your chosen provider</p>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle size={13} className="text-green-500 shrink-0" />
            <p>Wallet is credited instantly after successful payment</p>
          </div>
          {provider === 'monnify' && !virtualAcct && (
            <div className="flex items-center gap-2">
              <Building2 size={13} className="text-brand-blue shrink-0" />
              <p>Monnify also supports direct checkout (no virtual account needed)</p>
            </div>
          )}
        </div>

        {/* Pay button — not shown for Monnify virtual account (user just transfers) */}
        {!(provider === 'monnify' && virtualAcct) && (
          <Button
            fullWidth
            size="lg"
            loading={loading}
            onClick={handleFund}
            className="shadow-lg shadow-blue-500/20"
          >
            Pay ₦{amount ? parseFloat(amount).toLocaleString() : '0'} via {PROVIDERS.find((p) => p.id === provider)?.name}
            <ChevronRight size={18} className="ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
