'use client';

import { register } from '@/lib/api';
import { AxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const isValid = useMemo(
    () => orgName.trim().length >= 2 && email.includes('@') && password.length >= 6,
    [email, orgName, password]
  );

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    if (!isValid) {
      setError('Enter organization, email, and a password with at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await register({ email, password, orgName });
      router.push('/dashboard');
    } catch (err) {
      const errorResponse = err as AxiosError<{ error?: string }>;
      const apiMessage = errorResponse.response?.data?.error;
      const networkMessage = errorResponse.request
        ? 'Cannot reach the API server. Please try again later.'
        : undefined;

      setError(apiMessage || networkMessage || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f6f7f9] text-slate-950 lg:grid-cols-[1fr_500px]">
      <section className="hidden border-r border-slate-200 bg-white px-10 py-10 lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">LF</div>
          <div>
            <p className="text-sm font-semibold text-slate-950">LedgerFlow</p>
            <p className="text-xs text-slate-500">Finance operations</p>
          </div>
        </div>

        <div className="mt-auto max-w-xl pb-10">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">New workspace</p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight text-slate-950">
            Start with a tidy ledger your team can trust.
          </h1>
          <div className="mt-10 grid max-w-lg gap-3">
            {['Role-based access', 'Income and expense tracking', 'CSV exports for reporting'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <span className="size-2 rounded-full bg-teal-700" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <form onSubmit={handleRegister} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="mb-8">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="grid size-10 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">LF</div>
              <p className="text-sm font-semibold text-slate-950">LedgerFlow</p>
            </div>
            <p className="text-sm font-medium text-teal-700">Create workspace</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Set up your organization</h2>
          </div>

          {error && <p className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <label className="block text-sm font-medium text-slate-700">
            Organization
            <input
              className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none placeholder:text-slate-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10"
              placeholder="Acme Finance"
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Email
            <input
              className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none placeholder:text-slate-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Password
            <input
              className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950 outline-none placeholder:text-slate-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10"
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
            {isSubmitting ? 'Creating...' : 'Create account'}
          </button>
          <p className="mt-6 text-center text-sm text-slate-600">
            Already registered? <Link href="/login" className="font-semibold text-teal-700 hover:text-teal-800">Sign in</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
