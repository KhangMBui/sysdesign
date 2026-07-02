import { useState, type FormEvent } from 'react';
import Modal from './Modal';
import { Button, Field, inputClass } from './ui';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onRegisterSuccess?: () => void;
}

export default function AuthModal({ open, onClose, onRegisterSuccess }: AuthModalProps) {
  const { login, register, error, clearError } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setEmail('');
    setPassword('');
    clearError();
  }

  function switchTab(t: 'login' | 'register') {
    setTab(t);
    reset();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (tab === 'login') {
        await login(email, password);
        onClose();
      } else {
        await register(email, password);
        onClose();
        onRegisterSuccess?.();
      }
    } catch {
      // error already set in AuthContext
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={tab === 'login' ? 'Sign in' : 'Create account'}
      onClose={() => { onClose(); reset(); }}
    >
      {/* Tab switcher */}
      <div className="mb-5 flex rounded-lg border border-slate-200 p-1 text-sm">
        <button
          type="button"
          onClick={() => switchTab('login')}
          className={`flex-1 rounded-md py-1.5 font-medium transition ${
            tab === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => switchTab('register')}
          className={`flex-1 rounded-md py-1.5 font-medium transition ${
            tab === 'register' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Create account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Email">
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder={tab === 'register' ? 'At least 8 characters' : ''}
          />
        </Field>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Please wait…' : tab === 'login' ? 'Sign in' : 'Create account'}
        </Button>
      </form>
    </Modal>
  );
}
