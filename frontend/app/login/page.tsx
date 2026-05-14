'use client';

import { login, restoreSession } from '@/lib/api';
import { AxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const isValid = useMemo(() => email.includes('@') && password.length >= 6, [email, password]);

  useEffect(() => {
    restoreSession()
      .then(() => router.replace('/dashboard'))
      .catch(() => undefined);
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) {
      setError('Enter a valid email and password.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await login({ email, password });
      router.push('/dashboard');
    } catch (err) {
      const errorResponse = err as AxiosError<{ error?: string }>;
      setError(errorResponse.response?.data?.error || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f6f7f9] text-slate-950 lg:grid-cols-[1fr_480px]">
      <section className="hidden border-r border-slate-200 bg-white px-10 py-10 lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">LF</div>
          <div>
            <p className="text-sm font-semibold text-slate-950">LedgerFlow</p>
            <p className="text-xs text-slate-500">Finance operations</p>
          </div>
        </div>

        <div className="mt-auto max-w-xl pb-10">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Expense control</p>
          <h1 className="mt-5 max-w-2xl text-5xl font-semibold leading-tight text-slate-950">
            Clean tracking for income, expenses, and team spending.
          </h1>
          <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
            <PreviewMetric label="Monthly income" value="Rs. 84,200" />
            <PreviewMetric label="Expenses" value="Rs. 31,480" />
            <PreviewMetric label="Balance" value="Rs. 52,720" />
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="mb-8">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="grid size-10 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">LF</div>
              <p className="text-sm font-semibold text-slate-950">LedgerFlow</p>
            </div>
            <p className="text-sm font-medium text-teal-700">Welcome back</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Sign in to your workspace</h2>
          </div>

          {error && <p className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none placeholder:text-slate-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Password
            <input
              className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none placeholder:text-slate-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button
            disabled={!isValid || isSubmitting}
            className="mt-6 h-11 w-full rounded-md bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="mt-6 text-center text-sm text-slate-600">
            New organization? <Link href="/register" className="font-semibold text-teal-700 hover:text-teal-800">Create account</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}
