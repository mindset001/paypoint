'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowLeft, Building2, CheckCircle2, XCircle, Loader2, Plus, Trash2, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PinInput } from '@/components/ui/PinInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { withdrawApi } from '@/lib/api';
import { getErrorMessage, formatNGN } from '@/lib/utils';
import { cn } from '@/lib/cn';
import { PurchaseSuccess } from '@/components/receipt/PurchaseSuccess';

interface Bank { code: string; name: string }
interface BankAccount { id: string; bankCode: string; bankName: string; accountNumber: string; accountName: string }
type Step = 'accounts' | 'add-account' | 'amount' | 'pin';

// Paystack blocks third-party payouts until the business completes its
// compliance/verification tier upgrade — flip this back on once that's
// done. Everything below is already built and tested; this is the only
// gate.
const WITHDRAW_ENABLED = false;

function ComingSoon() {
  const router = useRouter();
  return (
    <div>
      <div className="bg-gradient-to-br from-teal-600 to-teal-800 px-6 pt-14 md:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4"><ArrowLeft size={22} /></button>
        <h1 className="text-white text-2xl font-black">Withdraw to Bank</h1>
        <p className="text-teal-100 text-sm">Move money to your bank account</p>
      </div>
      <div className="px-5 -mt-4 pb-8">
        <div className="bg-surface rounded-3xl p-8 shadow-sm flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
            <Clock size={26} className="text-teal-600" />
          </div>
          <h2 className="font-bold text-ink text-lg">Coming Soon</h2>
          <p className="text-ink-muted text-sm">
            Bank withdrawals are being set up and will be available shortly. Check back soon!
          </p>
          <Button fullWidth size="lg" className="mt-2" onClick={() => router.push('/wallet')}>Back to Wallet</Button>
        </div>
      </div>
    </div>
  );
}

function WithdrawPageInner() {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [step, setStep] = useState<Step>('accounts');

  // Add-account sub-flow
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [verifyState, setVerifyState] = useState<'idle' | 'checking' | 'found' | 'error'>('idle');
  const [verifiedName, setVerifiedName] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [amount, setAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<{ amount: string }>();

  useEffect(() => {
    withdrawApi.banks().then(({ data }) => setBanks(data.data || [])).catch(() => setBanks([]));
    loadAccounts();
  }, []);

  const loadAccounts = () => {
    setLoadingAccounts(true);
    withdrawApi.listAccounts()
      .then(({ data }) => setAccounts(data.data || []))
      .catch(() => setAccounts([]))
      .finally(() => setLoadingAccounts(false));
  };

  const filteredBanks = useMemo(() => {
    if (!bankSearch.trim()) return [];
    const q = bankSearch.toLowerCase();
    return banks.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 8);
  }, [bankSearch, banks]);

  // Debounced account verification once a bank + full account number are picked
  useEffect(() => {
    setVerifyState('idle');
    setVerifiedName('');
    if (!selectedBank || accountNumber.trim().length !== 10) return;

    const t = setTimeout(async () => {
      setVerifyState('checking');
      try {
        const { data } = await withdrawApi.verifyAccount(selectedBank.code, accountNumber.trim());
        setVerifiedName(data.data.accountName);
        setVerifyState('found');
      } catch (err) {
        setVerifyError(getErrorMessage(err));
        setVerifyState('error');
      }
    }, 500);
    return () => clearTimeout(t);
  }, [selectedBank, accountNumber]);

  const saveAccount = async () => {
    if (!selectedBank || verifyState !== 'found') return;
    setSavingAccount(true);
    try {
      const { data } = await withdrawApi.addAccount(selectedBank.code, selectedBank.name, accountNumber.trim());
      toast.success('Bank account saved!');
      setAccounts((prev) => [data.data, ...prev]);
      setSelectedAccount(data.data);
      setStep('amount');
      setBankSearch(''); setSelectedBank(null); setAccountNumber(''); setVerifyState('idle');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingAccount(false);
    }
  };

  const removeAccount = async (id: string) => {
    try {
      await withdrawApi.deleteAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      toast.success('Bank account removed');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onAmountSubmit = (data: { amount: string }) => {
    setAmount(data.amount);
    setStep('pin');
  };

  const handlePinComplete = async (pin: string) => {
    if (!selectedAccount) return;
    setWithdrawing(true);
    try {
      const res = await withdrawApi.withdraw(selectedAccount.id, parseFloat(amount), pin);
      toast.success(res.data.data.status === 'success' ? 'Withdrawal successful!' : 'Withdrawal is processing');
      setReference(res.data.data.reference);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setStep('amount');
    } finally {
      setWithdrawing(false);
    }
  };

  if (reference) {
    return (
      <PurchaseSuccess
        reference={reference}
        title="Withdrawal Submitted"
        subtitle={`₦${amount} to ${selectedAccount?.bankName} ${selectedAccount?.accountNumber}`}
        onDone={() => router.push('/wallet')}
      />
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-teal-600 to-teal-800 px-6 pt-14 md:pt-8 pb-8">
        <button onClick={() => (step === 'accounts' ? router.back() : setStep('accounts'))} className="text-white mb-4">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-2xl font-black">Withdraw to Bank</h1>
        <p className="text-teal-100 text-sm">Move money to your bank account</p>
      </div>

      <div className="px-5 -mt-4 pb-8">
        <div className="bg-surface rounded-3xl p-5 shadow-sm flex flex-col gap-5">
          {step === 'accounts' && (
            <>
              {loadingAccounts ? (
                <div className="flex flex-col gap-2">
                  {Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : accounts.length > 0 && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-ink-muted">Saved Accounts</label>
                  {accounts.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 p-3 border border-line rounded-2xl">
                      <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                        <Building2 size={18} className="text-teal-600" />
                      </div>
                      <button onClick={() => { setSelectedAccount(a); setStep('amount'); }} className="flex-1 text-left">
                        <p className="text-sm font-bold text-ink">{a.accountName}</p>
                        <p className="text-xs text-ink-muted">{a.bankName} · {a.accountNumber}</p>
                      </button>
                      <button onClick={() => removeAccount(a.id)} className="text-ink-muted hover:text-red-500 p-1">
                        <Trash2 size={16} />
                      </button>
                      <ChevronRight size={16} className="text-ink-muted" />
                    </div>
                  ))}
                </div>
              )}
              <Button fullWidth size="lg" variant={accounts.length > 0 ? 'secondary' : 'primary'} onClick={() => setStep('add-account')}>
                <span className="flex items-center gap-2 justify-center"><Plus size={18} /> Add Bank Account</span>
              </Button>
            </>
          )}

          {step === 'add-account' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-ink-muted mb-2 block">Bank</label>
                {selectedBank ? (
                  <div className="flex items-center justify-between p-3 border-2 border-teal-500 bg-teal-50 dark:bg-teal-500/10 rounded-xl">
                    <span className="text-sm font-bold text-ink">{selectedBank.name}</span>
                    <button onClick={() => { setSelectedBank(null); setBankSearch(''); }} className="text-xs text-teal-600 font-semibold">Change</button>
                  </div>
                ) : (
                  <>
                    <Input placeholder="Search for your bank..." value={bankSearch} onChange={(e) => setBankSearch(e.target.value)} />
                    {filteredBanks.length > 0 && (
                      <div className="mt-1 border border-line rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                        {filteredBanks.map((b) => (
                          <button key={b.code} type="button" onClick={() => { setSelectedBank(b); setBankSearch(''); }}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-surface-2 border-b border-line last:border-0">
                            {b.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {selectedBank && (
                <div>
                  <Input
                    label="Account Number" placeholder="0123456789" maxLength={10}
                    value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  />
                  {verifyState === 'checking' && (
                    <p className="flex items-center gap-1.5 text-xs text-ink-muted mt-2">
                      <Loader2 size={14} className="animate-spin" /> Verifying account...
                    </p>
                  )}
                  {verifyState === 'found' && (
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400 mt-2">
                      <CheckCircle2 size={16} /> {verifiedName}
                    </p>
                  )}
                  {verifyState === 'error' && (
                    <p className="flex items-center gap-1.5 text-xs text-red-600 mt-2">
                      <XCircle size={14} /> {verifyError}
                    </p>
                  )}
                </div>
              )}

              <Button fullWidth size="lg" loading={savingAccount} disabled={verifyState !== 'found'} onClick={saveAccount}>
                Save &amp; Continue
              </Button>
            </div>
          )}

          {step === 'amount' && selectedAccount && (
            <form onSubmit={handleSubmit(onAmountSubmit)} className="flex flex-col gap-4">
              <div className="bg-surface-2 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                  <Building2 size={16} className="text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">{selectedAccount.accountName}</p>
                  <p className="text-xs text-ink-muted">{selectedAccount.bankName} · {selectedAccount.accountNumber}</p>
                </div>
              </div>
              <Input
                label="Amount (₦)" placeholder="Enter amount" type="number" min={500}
                error={errors.amount?.message}
                {...register('amount', { required: 'Amount is required', min: { value: 500, message: 'Minimum ₦500' } })}
              />
              <Button type="submit" fullWidth size="lg">Continue</Button>
            </form>
          )}

          {step === 'pin' && selectedAccount && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="text-center mb-2">
                <p className="text-ink-muted text-sm">Withdrawing <strong>{formatNGN(parseFloat(amount) * 100)}</strong> to</p>
                <p className="font-bold text-ink">{selectedAccount.bankName} · {selectedAccount.accountNumber}</p>
              </div>
              <PinInput length={4} onComplete={handlePinComplete} label="Enter Transaction PIN" />
              {withdrawing && <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />}
              <button onClick={() => setStep('amount')} className="text-sm text-ink-muted underline">Go back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WithdrawPage() {
  return WITHDRAW_ENABLED ? <WithdrawPageInner /> : <ComingSoon />;
}
