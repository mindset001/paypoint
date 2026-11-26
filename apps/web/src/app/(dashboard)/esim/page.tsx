'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Globe, Wifi, Check, CalendarClock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { PinInput } from '@/components/ui/PinInput';
import { esimApi } from '@/lib/api';
import { formatNGN, getErrorMessage } from '@/lib/utils';
import { ESIM_COUNTRIES } from '@/lib/esimCountries';
import { cn } from '@/lib/cn';

interface EsimPackage {
  packageCode: string;
  name: string;
  countryCode: string;
  dataAllowanceMB: number;
  validityDays: number;
  validity: string;
  priceNGNKobo: number;
}

// Display order for the validity filter tabs — only shown when at least
// one package in the current list actually falls into that bucket.
const VALIDITY_ORDER = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } };
const item = { hidden: { opacity: 0, y: 10, scale: 0.95 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: 'easeOut' as const } } };

export default function EsimPage() {
  const router = useRouter();
  const [country, setCountry] = useState<string | null>(null);
  const [packages, setPackages] = useState<EsimPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [selected, setSelected] = useState<EsimPackage | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [buying, setBuying] = useState(false);
  const [validityFilter, setValidityFilter] = useState('All');
  const [countryOpen, setCountryOpen] = useState(false);

  const selectedCountryInfo = ESIM_COUNTRIES.find((c) => c.code === country);

  const availableFilters = useMemo(
    () => ['All', ...VALIDITY_ORDER.filter((v) => packages.some((p) => p.validity === v))],
    [packages]
  );
  const filteredPackages = validityFilter === 'All' ? packages : packages.filter((p) => p.validity === validityFilter);

  const selectCountry = async (code: string) => {
    setCountry(code);
    setCountryOpen(false);
    setLoading(true);
    setUnavailable(false);
    setPackages([]);
    setValidityFilter('All');
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
      <div className="bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-700 px-6 pt-14 md:pt-8 pb-10 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-16 bottom-0 w-28 h-28 rounded-full bg-white/10 blur-xl" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute right-6 top-6 text-white/10"
        >
          <Globe size={90} strokeWidth={1} />
        </motion.div>
        <button onClick={() => router.back()} className="text-white mb-4 relative"><ArrowLeft size={22} /></button>
        <h1 className="text-white text-2xl font-black relative">eSIM</h1>
        <p className="text-cyan-50/90 text-sm relative">Stay connected anywhere you travel</p>
      </div>

      <div className="px-5 -mt-5 pb-8">
        <div className="bg-surface rounded-3xl p-5 shadow-lg shadow-black/5 flex flex-col gap-4">
          {showPin && selected ? (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="w-16 h-16 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center text-3xl">
                {selectedCountryInfo?.flag ?? '🌍'}
              </div>
              <div className="text-center mb-1">
                <p className="text-ink-muted text-sm">Buying <strong className="text-ink">{selected.name}</strong></p>
                <p className="font-black text-lg text-cyan-600">{formatNGN(selected.priceNGNKobo)}</p>
              </div>
              <PinInput length={4} onComplete={handlePinComplete} label="Enter Transaction PIN" />
              {buying && <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />}
              <button onClick={() => setShowPin(false)} className="text-sm text-ink-muted underline">Go back</button>
            </div>
          ) : (
            <>
              <div className="relative">
                <label className="text-sm font-medium text-ink-muted mb-2 block">Choose a destination</label>
                <button type="button" onClick={() => setCountryOpen((o) => !o)}
                  className={cn('w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border-2 transition-all',
                    countryOpen ? 'border-cyan-500' : 'border-line')}>
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl leading-none flex-shrink-0">{selectedCountryInfo?.flag ?? '🌍'}</span>
                    <span className={cn('font-semibold truncate', selectedCountryInfo ? 'text-ink' : 'text-ink-muted')}>
                      {selectedCountryInfo?.name ?? 'Select a destination'}
                    </span>
                  </span>
                  <ChevronDown size={18} className={cn('text-ink-muted flex-shrink-0 transition-transform', countryOpen && 'rotate-180')} />
                </button>

                <AnimatePresence>
                  {countryOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setCountryOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 top-full mt-2 z-20 bg-surface border border-line rounded-2xl shadow-xl max-h-72 overflow-y-auto p-1.5"
                      >
                        {ESIM_COUNTRIES.map((c) => {
                          const sel = country === c.code;
                          return (
                            <button key={c.code} type="button" onClick={() => selectCountry(c.code)}
                              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                                sel ? 'bg-cyan-50 dark:bg-cyan-500/10' : 'hover:bg-surface-2')}>
                              <span className="text-xl leading-none">{c.flag}</span>
                              <span className="flex-1 font-medium text-sm text-ink">{c.name}</span>
                              {sel && <Check size={16} className="text-cyan-600 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
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
                    {availableFilters.length > 1 && (
                      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
                        {availableFilters.map((f) => (
                          <button type="button" key={f} onClick={() => setValidityFilter(f)}
                            className={cn('px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all flex-shrink-0',
                              validityFilter === f ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600' : 'border-line text-ink-muted')}>
                            {f}
                          </button>
                        ))}
                      </div>
                    )}

                    {filteredPackages.length === 0 ? (
                      <p className="text-ink-muted text-sm text-center py-4">No {validityFilter.toLowerCase()} plans for this destination</p>
                    ) : (
                      <motion.div variants={stagger} initial="hidden" animate="show" key={`${country}-${validityFilter}`} className="flex flex-col gap-2.5">
                        {filteredPackages.map((pkg) => (
                          <motion.button variants={item} whileTap={{ scale: 0.98 }} key={pkg.packageCode} type="button"
                            onClick={() => { setSelected(pkg); setShowPin(true); }}
                            className="border border-line rounded-2xl p-4 flex items-center justify-between text-left transition-all hover:border-cyan-500/40 hover:shadow-md hover:shadow-cyan-500/5">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white flex-shrink-0">
                                <Wifi size={20} />
                              </div>
                              <div>
                                <p className="font-bold text-ink">{pkg.name}</p>
                                <span className="inline-flex items-center gap-1 text-xs text-ink-muted mt-0.5">
                                  <CalendarClock size={12} /> {pkg.validityDays} days
                                </span>
                              </div>
                            </div>
                            <p className="font-black text-cyan-600">{formatNGN(pkg.priceNGNKobo)}</p>
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
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
