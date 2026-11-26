'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ajoApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

export default function JoinAjoPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) return toast.error('Enter an invite code');
    setSubmitting(true);
    try {
      const { data } = await ajoApi.join(code.trim());
      toast.success(`Joined "${data.data.name}"!`);
      router.replace(`/ajo/${data.data.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 px-6 pt-14 md:pt-8 pb-8">
        <button onClick={() => router.back()} className="text-white mb-4"><ArrowLeft size={22} /></button>
        <h1 className="text-white text-2xl font-black">Join an Ajo Group</h1>
        <p className="text-indigo-100 text-sm">Enter the invite code a friend sent you</p>
      </div>

      <div className="px-5 -mt-4 pb-8">
        <div className="bg-surface rounded-3xl p-5 shadow-sm flex flex-col gap-4 items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
            <KeyRound size={24} className="text-indigo-600" />
          </div>
          <Input
            label="Invite code"
            placeholder="e.g. A8AD242A"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="text-center tracking-widest font-bold uppercase"
          />
          <p className="text-xs text-ink-muted bg-surface-2 rounded-xl p-3 text-left">
            Joining pre-authorizes automatic wallet contributions when it's your group's turn to pay — no PIN prompt each time.
          </p>
          <Button fullWidth size="lg" loading={submitting} onClick={handleJoin}>Join Group</Button>
        </div>
      </div>
    </div>
  );
}
