'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PinInput } from '@/components/ui/PinInput';
import { examApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { cn } from '@/lib/cn';

interface ExamType { id: string; name: string; amount: number; description: string }

export default function ExamPage() {
  const router = useRouter();
  const [types, setTypes] = useState<ExamType[]>([]);
  const [selected, setSelected] = useState<ExamType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ pins: string[] } | null>(null);

  useEffect(() => {
    examApi.types().then(({ data }) => setTypes(data.data || [])).catch(() => {});
  }, []);

  const handlePinComplete = async (pin: string) => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await examApi.buy(selected.id, quantity, selected.amount * quantity, pin);
      setResult({ pins: res.data.data.pins || [res.data.data.pin] });
      toast.success('Exam PIN purchased!');
    } catch (err) {
      toast.error(getErrorMessage(err));
      setShowPin(false);
    } finally { setLoading(false); }
  };

  if (result) {
    return (
      <div className="px-5 pt-12 lg:pt-8 pb-8 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl">🎓</div>
        <h2 className="text-xl font-black">Purchase Successful!</h2>
        <div className="bg-green-50 rounded-2xl p-5 w-full flex flex-col gap-3">
          {result.pins.map((p, i) => (
            <div key={i} className="bg-white rounded-xl p-3 border border-green-100">
              <p className="text-xs text-gray-400 mb-1">PIN {i + 1}</p>
              <p className="text-xl font-black tracking-widest text-green-700">{p}</p>
            </div>
          ))}
        </div>
        <Button fullWidth size="lg" onClick={() => router.push('/home')}>Back to Home</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-green-600 to-green-800 px-6 pt-14 lg:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4"><ArrowLeft size={22} /></button>
        <h1 className="text-white text-2xl font-black">Exam Pins</h1>
        <p className="text-green-100 text-sm">WAEC, NECO, NABTEB, JAMB</p>
      </div>

      <div className="px-5 -mt-4 pb-8">
        <div className="bg-white rounded-3xl p-5 shadow-sm flex flex-col gap-5">
          {!showPin ? (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Select Exam Type</label>
                {types.length === 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {['WAEC', 'NECO', 'NABTEB', 'JAMB'].map((name) => (
                      <button key={name} onClick={() => setSelected({ id: name.toLowerCase(), name, amount: 3500, description: `${name} result checker` })}
                        className={cn('p-4 rounded-2xl border-2 text-left transition-all',
                          selected?.id === name.toLowerCase() ? 'border-green-600 bg-green-50' : 'border-gray-100')}>
                        <p className="font-black text-gray-900">{name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Result Checker</p>
                        <p className="text-sm font-bold text-green-700 mt-1">₦3,500</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {types.map((t) => (
                      <button key={t.id} onClick={() => setSelected(t)}
                        className={cn('p-4 rounded-2xl border-2 text-left transition-all',
                          selected?.id === t.id ? 'border-green-600 bg-green-50' : 'border-gray-100')}>
                        <p className="font-black text-gray-900">{t.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                        <p className="text-sm font-bold text-green-700 mt-1">₦{t.amount.toLocaleString()}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selected && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Quantity</label>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-full bg-gray-100 font-bold text-lg">−</button>
                    <span className="text-xl font-black w-8 text-center">{quantity}</span>
                    <button onClick={() => setQuantity(Math.min(5, quantity + 1))} className="w-10 h-10 rounded-full bg-gray-100 font-bold text-lg">+</button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Total: <strong>₦{((selected.amount || 3500) * quantity).toLocaleString()}</strong></p>
                </div>
              )}

              {selected && (
                <Button fullWidth size="lg" onClick={() => setShowPin(true)}>
                  Buy {quantity} {selected.name} PIN{quantity > 1 ? 's' : ''}
                </Button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-gray-500 text-sm">{quantity}x {selected?.name} PIN</p>
                <p className="font-bold text-gray-900">₦{((selected?.amount || 3500) * quantity).toLocaleString()}</p>
              </div>
              <PinInput length={4} onComplete={handlePinComplete} label="Enter Transaction PIN" />
              {loading && <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />}
              <button onClick={() => setShowPin(false)} className="text-sm text-gray-400 underline">Go back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
