'use client';
import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/cn';

// Omit 'prefix' — HTMLInputElement already has prefix: string | undefined, which conflicts with ReactNode
interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  suffix?: ReactNode;
  prefix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, suffix, prefix, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-ink-muted">{label}</label>}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-ink-muted pointer-events-none">{prefix}</span>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full border border-line rounded-xl px-4 py-3 text-sm bg-surface outline-none transition-colors',
            'focus:border-brand-blue focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20',
            'placeholder:text-ink-muted',
            error ? 'border-red-400 focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-500/20' : undefined,
            !!prefix && 'pl-9',
            !!suffix && 'pr-12',
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 z-10 flex items-center text-ink-muted">{suffix}</span>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';
