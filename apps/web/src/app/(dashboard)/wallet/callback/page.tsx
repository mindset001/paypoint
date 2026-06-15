'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { walletApi } from '@/lib/api';

type Status = 'verifying' | 'success' | 'failed';

function CallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('verifying');
  const [amount, setAmount] = useState<number | null>(null);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const provider = searchParams.get('provider') ?? '';

    // Extract reference per provider
    let reference = '';
    let transactionId: string | undefined;

    if (provider === 'paystack') {
      reference = searchParams.get('reference') ?? '';
    } else if (provider === 'flutterwave') {
      reference     = searchParams.get('tx_ref') ?? '';
      transactionId = searchParams.get('transaction_id') ?? undefined;
      const flwStatus = searchParams.get('status');
      if (flwStatus && flwStatus !== 'successful') {
        setStatus('failed');
        setErrMsg('Payment was not completed.');
        return;
      }
    } else if (provider === 'monnify') {
      reference = searchParams.get('paymentReference') ?? '';
      const monnifyStatus = searchParams.get('paymentStatus');
      if (monnifyStatus && monnifyStatus !== 'PAID') {
        setStatus('failed');
        setErrMsg('Payment was not completed.');
        return;
      }
    }

    if (!provider || !reference) {
      setStatus('failed');
      setErrMsg('Missing payment details. Please contact support.');
      return;
    }

    walletApi.verifyPayment(provider, reference, transactionId)
      .then((r) => {
        setAmount(r.data.data.amount);
        setStatus('success');
      })
      .catch((e) => {
        const msg = e.response?.data?.message ?? 'Verification failed';
        // If already credited (idempotency), treat as success
        if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate')) {
          setStatus('success');
        } else {
          setErrMsg(msg);
          setStatus('failed');
        }
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
      {status === 'verifying' && (
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <RefreshCw size={32} className="text-brand-blue animate-spin" />
          </div>
          <h1 className="text-gray-900 text-xl font-black mb-2">Verifying payment…</h1>
          <p className="text-gray-400 text-sm">Please wait, this takes a moment.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center max-w-xs">
          <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-5 animate-scale-in">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h1 className="text-gray-900 text-2xl font-black mb-2">Payment successful!</h1>
          {amount && (
            <p className="text-gray-500 text-base mb-1">
              <span className="text-green-600 font-bold">₦{amount.toLocaleString()}</span> has been added to your wallet.
            </p>
          )}
          <p className="text-gray-400 text-sm mb-8">Your wallet balance has been updated.</p>
          <button
            onClick={() => router.push('/wallet')}
            className="w-full flex items-center justify-center gap-2 bg-brand-blue text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 active:scale-95"
          >
            View Wallet <ArrowRight size={18} />
          </button>
          <button
            onClick={() => router.push('/home')}
            className="mt-3 w-full text-gray-500 text-sm font-medium py-2"
          >
            Go to Home
          </button>
        </div>
      )}

      {status === 'failed' && (
        <div className="text-center max-w-xs">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <XCircle size={40} className="text-red-500" />
          </div>
          <h1 className="text-gray-900 text-2xl font-black mb-2">Payment failed</h1>
          <p className="text-gray-400 text-sm mb-8">{errMsg || 'Something went wrong with your payment. Please try again.'}</p>
          <button
            onClick={() => router.push('/wallet/fund')}
            className="w-full flex items-center justify-center gap-2 bg-brand-blue text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-colors active:scale-95"
          >
            Try again <ArrowRight size={18} />
          </button>
          <button
            onClick={() => router.push('/home')}
            className="mt-3 w-full text-gray-500 text-sm font-medium py-2"
          >
            Go to Home
          </button>
        </div>
      )}
    </div>
  );
}

export default function WalletCallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}
