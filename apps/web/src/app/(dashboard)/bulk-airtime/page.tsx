'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PinInput } from '@/components/ui/PinInput';
import { airtimeApi } from '@/lib/api';
import { getErrorMessage, networkColors } from '@/lib/utils';
import type { Network } from '@/types';
import { cn } from '@/lib/cn';

const NETWORKS: Network[] = ['MTN', 'Airtel', 'Glo', '9mobile'];
const MAX_RECIPIENTS = 50;

interface Row { phone: string; amount: string }
interface RecipientResult { phone: string; amount: number; status: 'success' | 'failed'; reason?: string }

export default function BulkAirtimePage() {
  const router = useRouter();
  const [network, setNetwork] = useState<Network>('MTN');
  const [availableNetworks, setAvailableNetworks] = useState<Network[]>(NETWORKS);
  const [rows, setRows] = useState<Row[]>([{ phone: '', amount: '' }, { phone: '', amount: '' }]);

  useEffect(() => {
    airtimeApi.networks()
      .then((r) => {
        const live: Network[] = (r.data.data || []).map((n: { name: Network }) => n.name);
        if (live.length > 0) {
          setAvailableNetworks(live);
          setNetwork((cur) => (live.includes(cur) ? cur : live[0]));
        }
      })
      .catch(() => {});
  }, []);
  const [applyAmount, setApplyAmount] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ reference: string; message: string; results: RecipientResult[] } | null>(null);

  const updateRow = (i: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const addRow = () => rows.length < MAX_RECIPIENTS && setRows((prev) => [...prev, { phone: '', amount: '' }]);
  const removeRow = (i: number) => rows.length > 2 && setRows((prev) => prev.filter((_, idx) => idx !== i));
  const applyToAll = () => {
    if (!applyAmount) return;
    setRows((prev) => prev.map((r) => ({ ...r, amount: applyAmount })));
  };

  const validRows = rows.filter((r) => r.phone.trim() && r.amount);
  const total = validRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const canContinue = validRows.length >= 2 && validRows.length === rows.length;

  const handleContinue = () => {
    for (const r of rows) {
      if (!/^\+?[0-9]{10,14}$/.test(r.phone)) { toast.error(`Invalid phone number: ${r.phone || '(empty)'}`); return; }
      const amt = parseFloat(r.amount);
      if (!amt || amt < 50 || amt > 50000) { toast.error(`Amount for ${r.phone} must be ₦50–₦50,000`); return; }
    }
    setShowPin(true);
  };

  const handlePinComplete = async (pin: string) => {
    setLoading(true);
    try {
      const recipients = rows.map((r) => ({ phone: r.phone.trim(), amount: parseFloat(r.amount) }));
      const res = await airtimeApi.bulkBuy(network, recipients, pin);
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
        <div className="w-16 h-16 bg-green-100 dark:bg-green-500/15 rounded-full flex items-center justify-center text-3xl">📲</div>
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
      <div className="bg-gradient-to-br from-yellow-400 to-orange-400 px-6 pt-14 md:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4"><ArrowLeft size={22} /></button>
        <h1 className="text-white text-2xl font-black">Bulk Airtime</h1>
        <p className="text-yellow-100 text-sm">Send airtime to multiple numbers at once</p>
      </div>

      <div className="px-5 -mt-4 pb-8">
        <div className="bg-surface rounded-3xl p-5 shadow-sm flex flex-col gap-5">
          <div>
            <label className="text-sm font-medium text-ink-muted mb-2 block">Network</label>
            <div className="grid grid-cols-4 gap-2">
              {availableNetworks.map((n) => (
                <button key={n} onClick={() => setNetwork(n)}
                  className={cn('py-2 rounded-xl text-xs font-bold border-2 transition-all',
                    network === n ? 'border-brand-blue bg-blue-50 dark:bg-blue-500/10 text-brand-blue' : 'border-line text-ink-muted',
                    networkColors[n]?.split(' ')[0] ?? '')}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {!showPin ? (
            <>
              <div className="flex items-end gap-2">
                <Input
                  label="Apply amount to all"
                  placeholder="e.g. 500"
                  type="number"
                  value={applyAmount}
                  onChange={(e) => setApplyAmount(e.target.value)}
                />
                <Button type="button" onClick={applyToAll} className="mb-0.5">Apply</Button>
              </div>

              <div className="flex flex-col gap-2">
                {rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={row.phone}
                      onChange={(e) => updateRow(i, { phone: e.target.value.replace(/[^\d+]/g, '') })}
                      className="flex-[2] min-w-0 border border-line bg-surface rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                    <input
                      type="number"
                      placeholder="₦"
                      value={row.amount}
                      onChange={(e) => updateRow(i, { amount: e.target.value })}
                      className="flex-1 min-w-0 border border-line bg-surface rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                    <button type="button" onClick={() => removeRow(i)} disabled={rows.length <= 2}
                      className="text-ink-muted hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addRow} disabled={rows.length >= MAX_RECIPIENTS}
                className="flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-blue border border-dashed border-brand-blue/40 rounded-xl py-2.5 disabled:opacity-40 disabled:cursor-not-allowed">
                <Plus size={16} /> Add recipient
              </button>

              <div className="flex items-center justify-between px-1">
                <p className="text-sm text-ink-muted">{validRows.length} recipient{validRows.length === 1 ? '' : 's'}</p>
                <p className="text-sm font-bold text-ink">Total: ₦{total.toLocaleString()}</p>
              </div>

              <Button fullWidth size="lg" onClick={handleContinue} disabled={!canContinue}>
                Continue
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="text-center mb-2">
                <p className="text-ink-muted text-sm">Sending airtime to <strong>{rows.length} numbers</strong></p>
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
