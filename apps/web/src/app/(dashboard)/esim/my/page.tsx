'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, RefreshCw, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyStateIllustration } from '@/components/illustrations/EmptyState';
import { esimApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
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
      <div className="bg-gradient-to-br from-cyan-500 to-blue-700 px-6 pt-14 md:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4"><ArrowLeft size={22} /></button>
        <h1 className="text-white text-2xl font-black">My eSIMs</h1>
        <p className="text-cyan-100 text-sm">Scan a QR code to install on your phone</p>
      </div>

      <div className="px-5 -mt-4 pb-8">
        <div className="bg-surface rounded-3xl p-5 shadow-sm flex flex-col gap-4">
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : esims.length === 0 ? (
            <div className="flex flex-col items-center text-center gap-2 py-8">
              <EmptyStateIllustration variant="wallet" />
              <p className="text-ink-muted text-sm">No eSIMs yet</p>
              <Button size="sm" onClick={() => router.push('/esim')}>Get an eSIM</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {esims.map((e) => (
                <div key={e._id} className="border border-line rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi size={16} className="text-cyan-500" />
                      <p className="font-bold text-ink">{e.packageName}</p>
                    </div>
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full',
                      e.status === 'active' ? 'bg-green-50 dark:bg-green-500/15 text-green-600'
                        : e.status === 'failed' ? 'bg-red-50 dark:bg-red-500/15 text-red-600'
                        : 'bg-yellow-50 dark:bg-yellow-500/15 text-yellow-600')}>
                      {e.status}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">{(e.dataAllowanceMB / 1024).toFixed(1)}GB · {e.validityDays} days</p>

                  {e.activationCode && (
                    <div className="flex flex-col items-center gap-2 bg-surface-2 rounded-xl p-4">
                      <QRCodeSVG value={e.activationCode} size={160} />
                      <p className="text-[10px] text-ink-muted text-center">Scan with your phone's camera to install, or add manually via Settings &gt; Cellular</p>
                    </div>
                  )}

                  {e.iccid && <p className="text-xs text-ink-muted">ICCID: {e.iccid}</p>}

                  {e.status === 'active' && (
                    <Button size="sm" variant="secondary" fullWidth loading={refreshingId === e._id} onClick={() => handleRefresh(e._id)}>
                      <span className="flex items-center gap-1.5"><RefreshCw size={14} /> Refresh Status</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
