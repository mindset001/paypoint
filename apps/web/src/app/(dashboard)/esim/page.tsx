'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Globe, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { PinInput } from '@/components/ui/PinInput';
import { esimApi } from '@/lib/api';
import { formatNGN, getErrorMessage } from '@/lib/utils';
import { cn } from '@/lib/cn';

const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
];

interface EsimPackage {
  packageCode: string;
  name: string;
  countryCode: string;
  dataAllowanceMB: number;
  validityDays: number;
  priceNGNKobo: number;
}

export default function EsimPage() {
  const router = useRouter();
  const [country, setCountry] = useState<string | null>(null);
  const [packages, setPackages] = useState<EsimPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [selected, setSelected] = useState<EsimPackage | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [buying, setBuying] = useState(false);

  const selectCountry = async (code: string) => {
    setCountry(code);
    setLoading(true);
    setUnavailable(false);
    setPackages([]);
    try {
      const { data } = await esimApi.packages(code);
      setPackages(data.data || []);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 503) setUnavailable(true);
      else toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePinComplete = async (pin: string) => {
    if (!selected) return;
    setBuying(true);
    try {
      await esimApi.buy(selected.packageCode, pin);
      toast.success('eSIM purchased! Find it in My eSIMs.');
      router.push('/esim/my');
    } catch (err) {
      toast.error(getErrorMessage(err));
      setShowPin(false);
    } finally {
      setBuying(false);
    }
  };

  return (
    <div>
      <div className="bg-gradient-to-br from-cyan-500 to-blue-700 px-6 pt-14 md:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4"><ArrowLeft size={22} /></button>
        <h1 className="text-white text-2xl font-black">eSIM</h1>
        <p className="text-cyan-100 text-sm">Stay connected anywhere you travel</p>
      </div>

      <div className="px-5 -mt-4 pb-8">
        <div className="bg-surface rounded-3xl p-5 shadow-sm flex flex-col gap-4">
          {showPin && selected ? (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="text-center mb-2">
                <p className="text-ink-muted text-sm">Buying <strong>{selected.name}</strong></p>
                <p className="font-bold text-ink">{formatNGN(selected.priceNGNKobo)}</p>
              </div>
              <PinInput length={4} onComplete={handlePinComplete} label="Enter Transaction PIN" />
              {buying && <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />}
              <button onClick={() => setShowPin(false)} className="text-sm text-ink-muted underline">Go back</button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-ink-muted mb-2 block">Choose a destination</label>
                <div className="grid grid-cols-3 gap-2">
                  {COUNTRIES.map((c) => (
                    <button key={c.code} type="button" onClick={() => selectCountry(c.code)}
                      className={cn('flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all',
                        country === c.code ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10' : 'border-line')}>
                      <span className="text-xl">{c.flag}</span>
                      <span className="text-[10px] font-semibold text-ink-muted text-center leading-tight">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {country && (
                loading ? (
                  <div className="flex flex-col gap-3">
                    {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : unavailable ? (
                  <div className="flex flex-col items-center text-center gap-2 py-8">
                    <Globe size={40} className="text-cyan-300" />
                    <p className="font-bold text-ink">eSIM is coming soon</p>
                    <p className="text-ink-muted text-sm">We're finishing setup with our eSIM partner — check back shortly.</p>
                  </div>
                ) : packages.length === 0 ? (
                  <p className="text-ink-muted text-sm text-center py-8">No plans available for this destination yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {packages.map((pkg) => (
                      <button key={pkg.packageCode} type="button" onClick={() => { setSelected(pkg); setShowPin(true); }}
                        className="border border-line rounded-2xl p-4 flex items-center justify-between text-left hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center text-cyan-600">
                            <Wifi size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-ink">{pkg.name}</p>
                            <p className="text-xs text-ink-muted">{(pkg.dataAllowanceMB / 1024).toFixed(1)}GB · {pkg.validityDays} days</p>
                          </div>
                        </div>
                        <p className="font-black text-cyan-600">{formatNGN(pkg.priceNGNKobo)}</p>
                      </button>
                    ))}
                  </div>
                )
              )}

              <Button variant="secondary" fullWidth onClick={() => router.push('/esim/my')}>View My eSIMs</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
