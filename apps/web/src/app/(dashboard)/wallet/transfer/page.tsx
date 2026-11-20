'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PinInput } from '@/components/ui/PinInput';
import { walletApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { cn } from '@/lib/cn';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];
const RECIPIENT_PATTERN = /^(\+?[0-9]{10,14}|\S+@\S+\.\S+)$/;

interface TransferForm { recipient: string; amount: string }
interface RecentRecipient { userId: string; name: string; identifier: string }

export default function TransferPage() {
  const router = useRouter();
  const [showPin, setShowPin] = useState(false);
  const [formData, setFormData] = useState<TransferForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<RecentRecipient[]>([]);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<TransferForm>();

  useEffect(() => {
    walletApi.recentRecipients()
      .then(({ data }) => setRecent(data.data || []))
      .catch(() => setRecent([]));
  }, []);

  const recipientValue = watch('recipient');
  const [verifyState, setVerifyState] = useState<'idle' | 'checking' | 'found' | 'error'>('idle');
  const [recipientName, setRecipientName] = useState('');
  const [recipientError, setRecipientError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setVerifyState('idle');
    setRecipientName('');
    setRecipientError('');

    if (!recipientValue || !RECIPIENT_PATTERN.test(recipientValue.trim())) return;

    debounceRef.current = setTimeout(async () => {
      setVerifyState('checking');
      try {
        const { data } = await walletApi.verifyRecipient(recipientValue.trim());
        setRecipientName(`${data.data.firstName} ${data.data.lastName}`);
        setVerifyState('found');
      } catch (err) {
        setRecipientError(getErrorMessage(err));
        setVerifyState('error');
      }
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [recipientValue]);

  const onSubmit = (data: TransferForm) => {
    if (verifyState !== 'found') return;
    setFormData(data);
    setShowPin(true);
  };

  const handlePinComplete = async (pin: string) => {
    if (!formData) return;
    setLoading(true);
    try {
      await walletApi.transfer(formData.recipient, parseFloat(formData.amount), pin);
      toast.success('Transfer successful!');
      router.push('/wallet');
    } catch (err) {
      toast.error(getErrorMessage(err));
      setShowPin(false);
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="bg-gradient-to-br from-green-600 to-green-800 px-6 pt-14 md:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4"><ArrowLeft size={22} /></button>
        <h1 className="text-white text-2xl font-black">Transfer</h1>
        <p className="text-green-100 text-sm">Send money to another WavyPay user</p>
      </div>

      <div className="px-5 -mt-4 pb-8">
        <div className="bg-surface rounded-3xl p-5 shadow-sm flex flex-col gap-5">
          {!showPin ? (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {recent.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-ink-muted mb-2 block">Recent Transfers</label>
                  <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
                    {recent.map((r) => (
                      <button type="button" key={r.userId}
                        onClick={() => setValue('recipient', r.identifier, { shouldValidate: true, shouldDirty: true })}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16">
                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 flex items-center justify-center font-bold text-sm">
                          {r.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>
                        <span className="text-xs text-ink-muted text-center leading-tight truncate w-full">
                          {r.name.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Input
                  label="Recipient (Phone or Email)"
                  placeholder="08012345678 or email@example.com"
                  error={errors.recipient?.message}
                  {...register('recipient', { required: 'Recipient is required' })}
                />
                {verifyState === 'checking' && (
                  <p className="flex items-center gap-1.5 text-xs text-ink-muted mt-2">
                    <Loader2 size={14} className="animate-spin" /> Looking up account...
                  </p>
                )}
                {verifyState === 'found' && (
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400 mt-2">
                    <CheckCircle2 size={16} /> {recipientName}
                  </p>
                )}
                {verifyState === 'error' && (
                  <p className="flex items-center gap-1.5 text-xs text-red-600 mt-2">
                    <XCircle size={14} /> {recipientError}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-ink-muted mb-2 block">Amount (₦)</label>
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {QUICK_AMOUNTS.map((a) => (
                    <button type="button" key={a} onClick={() => setValue('amount', a.toString())}
                      className={cn('py-2 rounded-xl text-xs font-semibold border transition-all',
                        watch('amount') === a.toString() ? 'border-green-600 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'border-line text-ink-muted')}>
                      ₦{a >= 1000 ? (a/1000)+'k' : a}
                    </button>
                  ))}
                </div>
                <Input placeholder="Enter amount" type="number" min={100}
                  error={errors.amount?.message}
                  {...register('amount', { required: 'Amount required', min: { value: 100, message: 'Min ₦100' } })} />
              </div>
              <Button type="submit" fullWidth size="lg" disabled={verifyState !== 'found'}>Continue</Button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-ink-muted text-sm">
                  Sending to <strong>{recipientName || formData?.recipient}</strong>
                  {recipientName && <span className="block text-xs text-ink-muted">{formData?.recipient}</span>}
                </p>
                <p className="text-2xl font-black text-ink">₦{parseFloat(formData?.amount || '0').toLocaleString()}</p>
              </div>
              <PinInput length={4} onComplete={handlePinComplete} label="Enter Transaction PIN" />
              {loading && <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />}
              <button onClick={() => setShowPin(false)} className="text-sm text-ink-muted underline">Go back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
