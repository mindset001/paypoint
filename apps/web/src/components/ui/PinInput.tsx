'use client';
import { useRef, useState, KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

interface PinInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  error?: string;
  label?: string;
}

export function PinInput({ length = 4, onComplete, error, label }: PinInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newValues = [...values];
    newValues[idx] = value.slice(-1);
    setValues(newValues);
    if (value && idx < length - 1) refs.current[idx + 1]?.focus();
    if (newValues.every((v) => v !== '')) onComplete(newValues.join(''));
  };

  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !values[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="flex gap-3 justify-center">
        {values.map((v, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={v}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={cn(
              'w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all',
              'focus:border-brand-blue focus:ring-2 focus:ring-blue-100',
              v ? 'border-brand-blue bg-blue-50' : 'border-gray-200 bg-white',
              error && 'border-red-400'
            )}
          />
        ))}
      </div>
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  );
}
