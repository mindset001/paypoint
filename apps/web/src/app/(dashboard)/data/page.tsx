'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone as PhoneIcon, UserCircle2, Wifi, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PinInput } from '@/components/ui/PinInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { dataApi } from '@/lib/api';
import { getErrorMessage, networkColors } from '@/lib/utils';
import type { Network } from '@/types';
import { cn } from '@/lib/cn';
import { PurchaseSuccess } from '@/components/receipt/PurchaseSuccess';
import { RecentNumbers } from '@/components/vtu/RecentNumbers';
import { NetworkSelector } from '@/components/vtu/NetworkSelector';

const VALIDITY_BADGE: Record<string, string> = {
  Daily: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10',
  Weekly: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10',
  Monthly: 'bg-green-50 text-green-600 dark:bg-green-500/10',
  Longer: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10',
  Other: 'bg-surface-2 text-ink-muted',
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.035 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } } };

// 9mobile has no data-bundle product on AidaPay at all (confirmed against
// their live provider list) — omitted here so it's never offered as a dead
// end. Airtime still supports all four networks; this is data-only.
const NETWORKS: Network[] = ['MTN', 'Airtel', 'Glo'];

// Display order for the validity filter tabs — only shown when at least
// one plan in the current list actually falls into that bucket.
const VALIDITY_ORDER = ['Daily', 'Weekly', 'Monthly', 'Longer', 'Other'];

interface Plan { planId: string; name: string; amount: number; validity: string }
interface Catalog { key: string; label: string }
interface DataForm { phone: string }

export default function DataPage() {
  const router = useRouter();
  const [network, setNetwork] = useState<Network>('MTN');
  const [availableNetworks, setAvailableNetworks] = useState<Network[]>(NETWORKS);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [catalog, setCatalog] = useState<string | undefined>(undefined);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [validityFilter, setValidityFilter] = useState('All');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<DataForm>();

  useEffect(() => {
    dataApi.networks()
      .then((r) => {
        const live: Network[] = r.data.data || [];
        if (live.length > 0) {
          setAvailableNetworks(live);
          if (!live.includes(network)) setNetwork(live[0]);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Networks with more than one catalog (e.g. MTN's regular bundles vs
  // FibreX home broadband) need the bundle-type picked before plans make
  // sense — refetch catalogs on network change, default to the first.
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

  const currentCatalogLabel = catalogs.length > 1 ? catalogs.find((c) => c.key === catalog)?.label : undefined;

  const pickContact = async () => {
    const contactsApi = (navigator as { contacts?: { select: (props: string[], opts: { multiple: boolean }) => Promise<{ tel?: string[] }[]> } }).contacts;
    if (!contactsApi) {
      toast.error('Contact picker not supported on this device');
      return;
    }
    try {
      const [contact] = await contactsApi.select(['tel'], { multiple: false });
      const tel = contact?.tel?.[0];
      if (tel) setValue('phone', tel.replace(/\s+/g, ''));
    } catch {
      // user cancelled the picker — not an error
    }
  };

  const onSubmit = (data: DataForm) => {
    if (!selectedPlan) { toast.error('Select a data plan'); return; }
    setPhone(data.phone);
    setShowPin(true);
  };

  const handlePinComplete = async (pin: string) => {
    if (!selectedPlan) return;
    setLoading(true);
    try {
      const res = await dataApi.buy(network, catalog, phone, selectedPlan.planId, selectedPlan.amount, pin);
      toast.success(`${selectedPlan.name} sent to ${phone}!`);
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
        title="Data Purchased!"
        subtitle={`${selectedPlan?.name} sent to ${phone}`}
        onDone={() => router.push('/home')}
      />
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-brand-blue to-blue-700 px-6 pt-14 md:pt-8 pb-10 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-12 bottom-0 w-24 h-24 rounded-full bg-white/10 blur-xl" />
        <button onClick={() => router.back()} className="text-white mb-4 relative"><ArrowLeft size={22} /></button>
        <div className="flex items-center gap-3 relative">
          <motion.div
            key={network}
            initial={{ scale: 0.7, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25 }}
            className={cn('w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base flex-shrink-0 ring-2 ring-white/40', networkColors[network])}
          >
            {network.charAt(0)}
          </motion.div>
          <div>
            <h1 className="text-white text-xl font-black">Buy Data Bundle</h1>
            <p className="text-blue-100 text-sm">{network}{currentCatalogLabel ? ` · ${currentCatalogLabel}` : ''}</p>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-5 pb-8">
        <div className="bg-surface rounded-3xl p-5 shadow-lg shadow-black/5 flex flex-col gap-5">
          <NetworkSelector networks={availableNetworks} value={network} onChange={setNetwork} />

          {catalogs.length > 1 && (
            <div>
              <label className="text-sm font-medium text-ink-muted mb-2 block">Bundle Type</label>
              <div className={cn('grid gap-2', catalogs.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
                {catalogs.map((c) => (
                  <motion.button key={c.key} type="button" whileTap={{ scale: 0.95 }} onClick={() => setCatalog(c.key)}
                    className={cn('py-2 px-2 rounded-xl text-xs font-bold border-2 transition-all',
                      catalog === c.key ? 'border-brand-blue bg-blue-50 dark:bg-blue-500/10 text-brand-blue shadow-sm' : 'border-line text-ink-muted')}>
                    {c.label}
                  </motion.button>
                ))}
              </div>
              {catalog === 'fibrex' && (
                <p className="text-xs text-ink-muted bg-surface-2 rounded-xl p-3 mt-2">
                  FibreX is MTN&apos;s home broadband service, billed monthly by speed — a different product from mobile data bundles.
                </p>
              )}
            </div>
          )}

          {!showPin ? (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <RecentNumbers onSelect={(phone, net) => {
                setValue('phone', phone, { shouldValidate: true, shouldDirty: true });
                if (net && availableNetworks.includes(net as Network)) setNetwork(net as Network);
              }} />
              <Input
                label={catalog === 'fibrex' ? 'Registered Phone Number' : 'Phone Number'} placeholder="0812 345 6789" type="tel"
                prefix={<PhoneIcon size={16} />}
                suffix={
                  <button type="button" onClick={pickContact} aria-label="Pick from contacts" className="hover:text-ink transition-colors">
                    <UserCircle2 size={20} />
                  </button>
                }
                error={errors.phone?.message}
                {...register('phone', { required: 'Phone is required' })}
              />

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
                    {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : plans.length === 0 ? (
                  <p className="text-sm text-ink-muted text-center py-4">No plans available</p>
                ) : filteredPlans.length === 0 ? (
                  <p className="text-sm text-ink-muted text-center py-4">No {validityFilter.toLowerCase()} plans for this bundle</p>
                ) : (
                  <motion.div variants={stagger} initial="hidden" animate="show" key={`${network}-${catalog}`}
                    className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto hide-scrollbar">
                    {filteredPlans.map((p) => {
                      const selected = selectedPlan?.planId === p.planId;
                      return (
                        <motion.button variants={item} whileTap={{ scale: 0.96 }} type="button" key={p.planId} onClick={() => setSelectedPlan(p)}
                          className={cn('relative p-3 rounded-2xl border-2 text-left transition-all',
                            selected ? 'border-brand-blue bg-blue-50 dark:bg-blue-500/10 shadow-md shadow-brand-blue/10' : 'border-line hover:border-brand-blue/30')}>
                          {selected && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                              className="absolute top-2 right-2 w-4 h-4 rounded-full bg-brand-blue text-white flex items-center justify-center">
                              <Check size={10} strokeWidth={3} />
                            </motion.div>
                          )}
                          <div className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-ink-muted mb-1.5">
                            <Wifi size={14} />
                          </div>
                          <p className="text-xs font-bold text-ink pr-4 leading-tight">{p.name}</p>
                          <span className={cn('inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1', VALIDITY_BADGE[p.validity] ?? VALIDITY_BADGE.Other)}>
                            {p.validity}
                          </span>
                          <p className="text-sm font-black text-brand-blue mt-1.5">₦{(p.amount).toLocaleString()}</p>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </div>

              <Button type="submit" fullWidth size="lg">Continue</Button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl', networkColors[network])}>
                {network.charAt(0)}
              </div>
              <div className="text-center mb-1">
                <p className="text-ink-muted text-sm">Sending <strong className="text-ink">{selectedPlan?.name}</strong> to</p>
                <p className="font-bold text-ink">{phone} · {network}</p>
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
