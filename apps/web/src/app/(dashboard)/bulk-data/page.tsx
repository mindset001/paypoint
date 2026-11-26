'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PinInput } from '@/components/ui/PinInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import type { Network } from '@/types';
import { cn } from '@/lib/cn';

// Matches /data — 9mobile has no data-bundle product on AidaPay at all.
const NETWORKS: Network[] = ['MTN', 'Airtel', 'Glo'];
const VALIDITY_ORDER = ['Daily', 'Weekly', 'Monthly', 'Longer', 'Other'];
const MAX_RECIPIENTS = 50;

interface Plan { planId: string; name: string; amount: number; validity: string }
interface Catalog { key: string; label: string }
interface RecipientResult { phone: string; amount: number; status: 'success' | 'failed'; reason?: string }

export default function BulkDataPage() {
  const router = useRouter();
  const [network, setNetwork] = useState<Network>('MTN');
  const [availableNetworks, setAvailableNetworks] = useState<Network[]>(NETWORKS);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);

  useEffect(() => {
    dataApi.networks()
      .then((r) => {
        const live: Network[] = r.data.data || [];
        if (live.length > 0) {
          setAvailableNetworks(live);
          setNetwork((cur) => (live.includes(cur) ? cur : live[0]));
        }
      })
      .catch(() => {});
  }, []);
  const [catalog, setCatalog] = useState<string | undefined>(undefined);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [validityFilter, setValidityFilter] = useState('All');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [phonesText, setPhonesText] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ reference: string; message: string; results: RecipientResult[] } | null>(null);

  useEffect(() => {
    setSelectedPlan(null);
    dataApi.catalogs(network)
      .then(({ data }) => {
        const list: Catalog[] = data.data || [];
        setCatalogs(list);
        setCatalog(list[0]?.key);
      })
      .catch(() => { setCatalogs([]); setCatalog(undefined); });
  }, [network]);

  useEffect(() => {
    setSelectedPlan(null);
    setValidityFilter('All');
    setLoadingPlans(true);
    dataApi.plans(network, catalog)
      .then(({ data }) => setPlans(data.data || []))
      .catch(() => setPlans([]))
      .finally(() => setLoadingPlans(false));
  }, [network, catalog]);

  const availableFilters = useMemo(
    () => ['All', ...VALIDITY_ORDER.filter((cat) => plans.some((p) => p.validity === cat))],
    [plans]
  );
  const filteredPlans = validityFilter === 'All' ? plans : plans.filter((p) => p.validity === validityFilter);

  const phones = useMemo(
    () => Array.from(new Set(phonesText.split(/[\n,]+/).map((p) => p.trim()).filter(Boolean))),
    [phonesText]
  );
  const invalidPhones = phones.filter((p) => !/^\+?[0-9]{10,14}$/.test(p));
  const total = selectedPlan ? selectedPlan.amount * phones.length : 0;
  const canContinue = !!selectedPlan && phones.length >= 2 && phones.length <= MAX_RECIPIENTS && invalidPhones.length === 0;

  const handlePinComplete = async (pin: string) => {
    if (!selectedPlan) return;
    setLoading(true);
    try {
      const res = await dataApi.bulkBuy(network, catalog, selectedPlan.planId, phones, pin);
      setResult(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setShowPin(false);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const successCount = result.results.filter((r) => r.status === 'success').length;
    return (
      <div className="px-5 pt-12 md:pt-8 pb-8 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-500/15 rounded-full flex items-center justify-center text-3xl">📶</div>
        <h2 className="text-xl font-black">{result.message}</h2>
        <p className="text-ink-muted text-sm">{successCount}/{result.results.length} sent successfully</p>
        <div className="bg-surface rounded-2xl border border-line w-full divide-y divide-line">
          {result.results.map((r, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{r.phone}</p>
                <p className="text-xs text-ink-muted">₦{r.amount.toLocaleString()}{r.reason ? ` — ${r.reason}` : ''}</p>
              </div>
              {r.status === 'success' ? (
                <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
              ) : (
                <XCircle size={18} className="text-red-500 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
        <Button fullWidth size="lg" onClick={() => router.push('/home')}>Back to Home</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-brand-blue to-blue-700 px-6 pt-14 md:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4"><ArrowLeft size={22} /></button>
        <h1 className="text-white text-2xl font-black">Bulk Data</h1>
        <p className="text-blue-100 text-sm">Send one data plan to multiple numbers</p>
      </div>

      <div className="px-5 -mt-4 pb-8">
        <div className="bg-surface rounded-3xl p-5 shadow-sm flex flex-col gap-5">
          <div>
            <label className="text-sm font-medium text-ink-muted mb-2 block">Network</label>
            <div className="grid grid-cols-3 gap-2">
              {availableNetworks.map((n) => (
                <button key={n} onClick={() => setNetwork(n)}
                  className={cn('py-2 rounded-xl text-xs font-bold border-2 transition-all',
                    network === n ? 'border-brand-blue bg-blue-50 dark:bg-blue-500/10 text-brand-blue' : 'border-line text-ink-muted')}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {catalogs.length > 1 && (
            <div>
              <label className="text-sm font-medium text-ink-muted mb-2 block">Bundle Type</label>
              <div className={cn('grid gap-2', catalogs.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
                {catalogs.map((c) => (
                  <button key={c.key} type="button" onClick={() => setCatalog(c.key)}
                    className={cn('py-2 px-2 rounded-xl text-xs font-bold border-2 transition-all',
                      catalog === c.key ? 'border-brand-blue bg-blue-50 dark:bg-blue-500/10 text-brand-blue' : 'border-line text-ink-muted')}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!showPin ? (
            <>
              <div>
                <label className="text-sm font-medium text-ink-muted mb-2 block">Choose a Plan</label>
                {!loadingPlans && plans.length > 0 && availableFilters.length > 1 && (
                  <div className="flex gap-1.5 mb-3 overflow-x-auto hide-scrollbar">
                    {availableFilters.map((f) => (
                      <button type="button" key={f} onClick={() => setValidityFilter(f)}
                        className={cn('px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex-shrink-0',
                          validityFilter === f ? 'border-brand-blue bg-blue-50 dark:bg-blue-500/10 text-brand-blue' : 'border-line text-ink-muted')}>
                        {f}
                      </button>
                    ))}
                  </div>
                )}
                {loadingPlans ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : plans.length === 0 ? (
                  <p className="text-sm text-ink-muted text-center py-4">No plans available</p>
                ) : filteredPlans.length === 0 ? (
                  <p className="text-sm text-ink-muted text-center py-4">No {validityFilter.toLowerCase()} plans for this bundle</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto hide-scrollbar">
                    {filteredPlans.map((p) => (
                      <button type="button" key={p.planId} onClick={() => setSelectedPlan(p)}
                        className={cn('p-3 rounded-xl border-2 text-left transition-all',
                          selectedPlan?.planId === p.planId ? 'border-brand-blue bg-blue-50 dark:bg-blue-500/10' : 'border-line')}>
                        <p className="text-xs font-bold text-ink">{p.name}</p>
                        <p className="text-xs text-ink-muted">{p.validity}</p>
                        <p className="text-sm font-black text-brand-blue mt-1">₦{p.amount.toLocaleString()}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-ink-muted mb-2 block">
                  Phone Numbers <span className="text-ink-muted font-normal">(one per line, up to {MAX_RECIPIENTS})</span>
                </label>
                <textarea
                  value={phonesText}
                  onChange={(e) => setPhonesText(e.target.value)}
                  placeholder={'08012345678\n08023456789\n...'}
                  rows={5}
                  className="w-full border border-line bg-surface rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
                />
                {invalidPhones.length > 0 && (
                  <p className="text-xs text-red-500 mt-1">Invalid: {invalidPhones.join(', ')}</p>
                )}
              </div>

              <div className="flex items-center justify-between px-1">
                <p className="text-sm text-ink-muted">{phones.length} recipient{phones.length === 1 ? '' : 's'}</p>
                <p className="text-sm font-bold text-ink">Total: ₦{total.toLocaleString()}</p>
              </div>

              <Button fullWidth size="lg" onClick={() => setShowPin(true)} disabled={!canContinue}>
                Continue
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="text-center mb-2">
                <p className="text-ink-muted text-sm">Sending <strong>{selectedPlan?.name}</strong> to <strong>{phones.length} numbers</strong></p>
                <p className="font-bold text-ink">Total ₦{total.toLocaleString()} ({network})</p>
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
