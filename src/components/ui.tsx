import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Difficulty } from '../db/types';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputBase =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

export const inputClass = inputBase;

const badgeColors: Record<Difficulty, string> = {
  '': 'bg-slate-100 text-slate-500',
  Junior: 'bg-emerald-100 text-emerald-700',
  'Mid-Level': 'bg-amber-100 text-amber-700',
  Senior: 'bg-rose-100 text-rose-700',
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  if (!difficulty) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeColors[difficulty]}`}>
      {difficulty}
    </span>
  );
}
