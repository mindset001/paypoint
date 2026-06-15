'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PinInput } from '@/components/ui/PinInput';
import { electricityApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { cn } from '@/lib/cn';

const DISCOS = ['IKEDC', 'EKEDC', 'AEDC', 'KAEDC', 'JED', 'PHEDC', 'KEDCO', 'BEDC'];
const METER_TYPES = ['prepaid', 'postpaid'];
const QUICK_AMOUNTS = [1000, 2000, 3000, 5000, 10000, 20000];

interface VerifiedMeter { name: string; address: string }
interface ElectricityForm { meterNumber: string; phone: string; amount: string }

export default function ElectricityPage() {
  const router = useRouter();
  const [disco, setDisco] = useState('IKEDC');
  const [meterType, setMeterType] = useState('prepaid');
  const [verified, setVerified] = useState<VerifiedMeter | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [meterNumber, setMeterNumber] = useState('');
  const [token, setToken] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ElectricityForm>();

  const onVerify = async (data: ElectricityForm) => {
    setVerifying(true);
    try {
      const res = await electricityApi.verify(disco, data.meterNumber, meterType);
      setVerified(res.data.data);
      setMeterNumber(data.meterNumber);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setVerifying(false); }
  };

  const handlePinComplete = async (pin: string) => {
    const data = watch();
    setLoading(true);
    try {
      const res = await electricityApi.pay(disco, meterNumber, meterType, parseFloat(data.amount), data.phone, pin);
      setToken(res.data.data.token || '');
      toast.success('Payment successful!');
    } catch (err) {
      toast.error(getErrorMessage(err));
      setShowPin(false);
    } finally { setLoading(false); }
  };

  if (token) {
    return (
      <div className="px-5 pt-12 lg:pt-8 pb-8 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-black text-gray-900">Payment Successful!</h2>
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 w-full">
          <p className="text-sm text-gray-500 mb-1">Your Electricity Token</p>
          <p className="text-2xl font-black text-orange-600 tracking-widest">{token}</p>
          <button
            onClick={() => { navigator.clipboard.writeText(token); toast.success('Token copied!'); }}
            className="flex items-center gap-1 text-xs text-orange-500 mt-2 mx-auto"
          >
            <Copy size={12} /> Copy token
          </button>
        </div>
        <Button fullWidth size="lg" onClick={() => router.push('/home')}>Back to Home</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-orange-500 to-orange-700 px-6 pt-14 lg:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4"><ArrowLeft size={22} /></button>
        <h1 className="text-white text-2xl font-black">Electricity</h1>
        <p className="text-orange-100 text-sm">Pay for prepaid & postpaid meters</p>
      </div>

      <div className="px-5 -mt-4 pb-8">
        <div className="bg-white rounded-3xl p-5 shadow-sm flex flex-col gap-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">DisCo</label>
            <div className="grid grid-cols-4 gap-1.5">
              {DISCOS.map((d) => (
                <button key={d} onClick={() => { setDisco(d); setVerified(null); }}
                  className={cn('py-2 rounded-xl text-xs font-bold border-2 transition-all',
                    disco === d ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 text-gray-600')}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {METER_TYPES.map((t) => (
              <button key={t} onClick={() => setMeterType(t)}
                className={cn('py-2.5 rounded-xl text-sm font-semibold border-2 transition-all capitalize',
                  meterType === t ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 text-gray-600')}>
                {t}
              </button>
            ))}
          </div>

          {!showPin ? (
            <form onSubmit={handleSubmit(onVerify)} className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Input placeholder="Meter Number" className="flex-1"
                  error={errors.meterNumber?.message}
                  {...register('meterNumber', { required: 'Required' })} />
                <Button type="submit" loading={verifying} size="md">Verify</Button>
              </div>

              {verified && (
                <div className="bg-green-50 rounded-xl p-4 flex gap-3 items-start">
                  <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{verified.name}</p>
                    <p className="text-xs text-gray-500">{verified.address}</p>
                  </div>
                </div>
              )}

              {verified && (
                <>
                  <Input
                    label="Phone Number (for receipt)"
                    placeholder="0812 345 6789"
                    type="tel"
                    error={errors.phone?.message}
                    {...register('phone', { required: 'Phone is required' })}
                  />
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Amount (₦)</label>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {QUICK_AMOUNTS.map((a) => (
                        <button type="button" key={a} onClick={() => setValue('amount', a.toString())}
                          className={cn('py-2 rounded-xl text-sm font-semibold border transition-all',
                            watch('amount') === a.toString() ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 text-gray-700 bg-gray-50')}>
                          ₦{a.toLocaleString()}
                        </button>
                      ))}
                    </div>
                    <Input placeholder="Or custom amount" type="number" min={500}
                      error={errors.amount?.message}
                      {...register('amount', { required: 'Amount required', min: { value: 500, message: 'Min ₦500' } })} />
                  </div>
                  <Button fullWidth size="lg" type="button" onClick={() => setShowPin(true)}>Pay Now</Button>
                </>
              )}
            </form>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-gray-500 text-sm">₦{watch('amount')} electricity for meter</p>
                <p className="font-bold text-gray-900">{meterNumber}</p>
              </div>
              <PinInput length={4} onComplete={handlePinComplete} label="Enter Transaction PIN" />
              {loading && <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />}
              <button onClick={() => setShowPin(false)} className="text-sm text-gray-400 underline">Go back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
