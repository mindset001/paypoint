'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, RefreshCw, Wifi, Signal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyStateIllustration } from '@/components/illustrations/EmptyState';
import { esimApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { esimFlagFor } from '@/lib/esimCountries';
import { cn } from '@/lib/cn';

interface EsimOrder {
  _id: string;
  packageName: string;
  countryCode: string;
  iccid?: string;
  activationCode?: string;
  dataAllowanceMB: number;
  validityDays: number;
  smdpStatus?: string;
  lastUsageBytes?: number;
  status: 'pending' | 'active' | 'failed';
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-white/20 text-white',
  failed: 'bg-red-500/90 text-white',
  pending: 'bg-amber-400/90 text-amber-950',
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } } };

export default function MyEsimsPage() {
  const router = useRouter();
  const [esims, setEsims] = useState<EsimOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    esimApi.my()
      .then(({ data }) => setEsims(data.data || []))
      .catch(() => setEsims([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = async (id: string) => {
    setRefreshingId(id);
    try {
      await esimApi.refresh(id);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRefreshingId(null);
    }
  };

  return (
    <div>
      <div className="bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-700 px-6 pt-14 md:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4"><ArrowLeft size={22} /></button>
        <h1 className="text-white text-2xl font-black">My eSIMs</h1>
        <p className="text-cyan-50/90 text-sm">Scan a QR code to install on your phone</p>
      </div>

      <div className="px-5 -mt-4 pb-8">
        {loading ? (
          <div className="flex flex-col gap-4">
            {Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-56 rounded-3xl" />)}
          </div>
        ) : esims.length === 0 ? (
          <div className="bg-surface rounded-3xl p-5 shadow-sm flex flex-col items-center text-center gap-2 py-8">
            <EmptyStateIllustration variant="wallet" />
            <p className="text-ink-muted text-sm">No eSIMs yet</p>
            <Button size="sm" onClick={() => router.push('/esim')}>Get an eSIM</Button>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
            {esims.map((e) => (
              <motion.div key={e._id} variants={item}
                className="rounded-3xl overflow-hidden shadow-lg shadow-black/10 bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-700 relative">
                <div className="px-5 pt-5 pb-7 flex items-start justify-between relative">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-2xl flex-shrink-0">
                      {esimFlagFor(e.countryCode)}
                    </div>
                    <div>
                      <p className="font-black text-white leading-tight">{e.packageName}</p>
                      <p className="text-white/70 text-xs">{(e.dataAllowanceMB / 1024).toFixed(1)}GB · {e.validityDays} days</p>
                    </div>
                  </div>
                  <span className={cn('text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full flex-shrink-0', STATUS_STYLE[e.status])}>
                    {e.status}
                  </span>
                </div>

                <div className="bg-surface px-5 pt-6 pb-5 flex flex-col gap-4 rounded-t-[28px] -mt-2">
                  {e.activationCode ? (
                    <div className="flex flex-col items-center gap-2 bg-surface-2 rounded-2xl p-4">
                      <QRCodeSVG value={e.activationCode} size={150} />
                      <p className="text-[10px] text-ink-muted text-center">Scan with your phone&apos;s camera to install, or add manually via Settings &gt; Cellular</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-surface-2 rounded-2xl p-4 text-ink-muted text-xs">
                      <Signal size={16} /> Still provisioning — check back shortly.
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    {e.iccid ? (
                      <span className="text-ink-muted font-mono">ICCID: {e.iccid}</span>
                    ) : <span />}
                    {e.status === 'active' && (
                      <button onClick={() => handleRefresh(e._id)} disabled={refreshingId === e._id}
                        className="flex items-center gap-1.5 text-cyan-600 font-semibold disabled:opacity-50">
                        <RefreshCw size={13} className={refreshingId === e._id ? 'animate-spin' : ''} /> Refresh
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            <Button variant="secondary" fullWidth onClick={() => router.push('/esim')}>
              <span className="flex items-center gap-2"><Wifi size={16} /> Get another eSIM</span>
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
