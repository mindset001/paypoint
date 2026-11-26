'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ArrowLeft, Smartphone, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PinInput } from '@/components/ui/PinInput';
import { airtimeApi } from '@/lib/api';
import { getErrorMessage, networkColors, networkGradients } from '@/lib/utils';
import type { Network } from '@/types';
import { cn } from '@/lib/cn';
import { PurchaseSuccess } from '@/components/receipt/PurchaseSuccess';
import { RecentNumbers } from '@/components/vtu/RecentNumbers';
import { NetworkSelector } from '@/components/vtu/NetworkSelector';

const NETWORKS: Network[] = ['MTN', 'Airtel', 'Glo', '9mobile'];
const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } } };

interface AirtimeForm {
  phone: string;
  amount: string;
}

export default function AirtimePage() {
  const router = useRouter();
  const [network, setNetwork] = useState<Network>('MTN');
  const [availableNetworks, setAvailableNetworks] = useState<Network[]>(NETWORKS);
  const [showPin, setShowPin] = useState(false);
  const [formData, setFormData] = useState<AirtimeForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<AirtimeForm>();

  useEffect(() => {
    airtimeApi.networks()
      .then((r) => {
        const live: Network[] = r.data.data || [];
        // A provider can vanish from AidaPay with no warning (e.g. MTN
        // airtime during an upstream outage) — hide it rather than let a
        // user pay into a purchase that's guaranteed to fail and refund.
        if (live.length > 0) {
          setAvailableNetworks(live);
          if (!live.includes(network)) setNetwork(live[0]);
        }
      })
      .catch(() => {}); // keep the full static list if the check itself fails
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (data: AirtimeForm) => {
    setFormData(data);
    setShowPin(true);
  };

  const handlePinComplete = async (pin: string) => {
    if (!formData) return;
    setLoading(true);
    try {
      const res = await airtimeApi.buy(network, formData.phone, parseFloat(formData.amount), pin);
      toast.success(`₦${formData.amount} ${network} airtime sent to ${formData.phone}!`);
      setReference(res.data.data.reference);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setShowPin(false);
    } finally {
      setLoading(false);
    }
  };

  if (reference) {
    return (
      <PurchaseSuccess
        reference={reference}
        title="Airtime Purchased!"
        subtitle={`₦${formData?.amount} ${network} airtime sent to ${formData?.phone}`}
        onDone={() => router.push('/home')}
      />
    );
  }

  const amount = watch('amount');

  return (
    <div>
      {/* Header — tints toward the selected network's brand color */}
      <motion.div
        key={network}
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={cn('bg-gradient-to-br px-6 pt-14 md:pt-8 pb-10 relative overflow-hidden', networkGradients[network] ?? 'from-yellow-400 to-orange-400')}
      >
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-10 bottom-0 w-24 h-24 rounded-full bg-white/10 blur-xl" />
        <button onClick={() => router.back()} className="text-white mb-4 relative">
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2 relative">
          <Zap size={20} className="text-white/90" fill="currentColor" />
          <h1 className="text-white text-2xl font-black">Buy Airtime</h1>
        </div>
        <p className="text-white/80 text-sm relative">Instant recharge, top up in seconds</p>
      </motion.div>

      <div className="px-5 -mt-5 pb-8">
        <div className="bg-surface rounded-3xl p-5 shadow-lg shadow-black/5 flex flex-col gap-5">
          <NetworkSelector networks={availableNetworks} value={network} onChange={setNetwork} />

          {!showPin ? (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <RecentNumbers onSelect={(phone, net) => {
                setValue('phone', phone, { shouldValidate: true, shouldDirty: true });
                if (net && availableNetworks.includes(net as Network)) setNetwork(net as Network);
              }} />
              <Input
                label="Phone Number"
                placeholder="0812 345 6789"
                prefix={<Smartphone size={16} />}
                type="tel"
                error={errors.phone?.message}
                {...register('phone', { required: 'Phone is required', pattern: { value: /^\+?[0-9]{10,14}$/, message: 'Invalid phone' } })}
              />

              <div>
                <label className="text-sm font-medium text-ink-muted mb-2 block">Amount (₦)</label>
                <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-3 gap-2 mb-3">
                  {QUICK_AMOUNTS.map((a) => {
                    const selected = amount === a.toString();
                    return (
                      <motion.button
                        variants={item}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        key={a}
                        onClick={() => setValue('amount', a.toString())}
                        className={cn(
                          'py-3 rounded-2xl text-base font-black border-2 transition-all',
                          selected
                            ? 'border-brand-blue bg-brand-blue text-white shadow-md shadow-brand-blue/30'
                            : 'border-line text-ink bg-surface-2 hover:border-brand-blue/40'
                        )}
                      >
                        ₦{a.toLocaleString()}
                      </motion.button>
                    );
                  })}
                </motion.div>
                <Input
                  placeholder="Or enter custom amount"
                  type="number"
                  min={50}
                  max={50000}
                  prefix="₦"
                  error={errors.amount?.message}
                  {...register('amount', { required: 'Amount is required', min: { value: 50, message: 'Min ₦50' }, max: { value: 50000, message: 'Max ₦50,000' } })}
                />
              </div>

              <Button type="submit" fullWidth size="lg">
                Continue
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl', networkColors[network])}>
                {network.charAt(0)}
              </div>
              <div className="text-center mb-1">
                <p className="text-ink-muted text-sm">Sending <strong className="text-ink">₦{formData?.amount}</strong> airtime to</p>
                <p className="font-bold text-ink">{formData?.phone} · {network}</p>
              </div>
              <PinInput length={4} onComplete={handlePinComplete} label="Enter Transaction PIN" />
              {loading && <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />}
              <button onClick={() => setShowPin(false)} className="text-sm text-ink-muted underline">Go back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
