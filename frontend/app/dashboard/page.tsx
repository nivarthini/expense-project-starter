'use client';

import api, { getProfile, logout, restoreSession } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { DashboardItem, PaginatedTransactions, TransactionType } from '@/lib/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const limit = 10;

export default function DashboardPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<'ALL' | TransactionType>('ALL');
  const [form, setForm] = useState({ title: '', amount: '', type: 'INCOME' as TransactionType, category: '' });
  const [formError, setFormError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getAccessToken()));
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (getAccessToken()) {
          setIsAuthenticated(true);
          return;
        }

        await restoreSession();
        setIsAuthenticated(true);

        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      } catch {
        router.replace('/login');
      }
    };

    checkAuth();
  }, [queryClient, router]);

  const transactionQuery = useQuery({
    queryKey: ['transactions', page, type],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (type !== 'ALL') params.set('type', type);
      const response = await api.get<PaginatedTransactions>(`/transactions?${params.toString()}`);
      return response.data;
    },
    enabled: isAuthenticated,
  });

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get<DashboardItem[]>('/transactions/dashboard');
      return response.data;
    },
    enabled: isAuthenticated,
  });

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: isAuthenticated,
  });

  const totals = useMemo(() => {
    const income = dashboardQuery.data?.find((item) => item.type === 'INCOME')?._sum.amount || 0;
    const expense = dashboardQuery.data?.find((item) => item.type === 'EXPENSE')?._sum.amount || 0;
    return { income, expense, balance: income - expense };
  }, [dashboardQuery.data]);

  const createMutation = useMutation({
    mutationFn: async () => api.post('/transactions', { ...form, amount: Number(form.amount) }),
    onSuccess: () => {
      setForm({ title: '', amount: '', type: 'INCOME', category: '' });
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      const errorResponse = err as AxiosError<{ error?: string }>;
      setFormError(errorResponse.response?.data?.error || 'Failed to create transaction');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const totalPages = Math.max(1, Math.ceil((transactionQuery.data?.total || 0) / limit));

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.category.trim() || Number(form.amount) <= 0) {
      setFormError('Enter title, category, and a positive amount.');
      return;
    }
    createMutation.mutate();
  }

  async function handleExport() {
    const response = await api.get('/transactions/export', { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transactions.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-slate-950">
      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">LF</div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">LedgerFlow</h1>
                <p className="text-sm text-slate-500">{profileQuery.data?.organization.name || 'Organization finance workspace'}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-10 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3">
              <div className="grid size-7 place-items-center rounded-full bg-teal-700 text-xs font-bold text-white">
                {getInitials(profileQuery.data?.displayName)}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-semibold text-slate-900">{profileQuery.data?.displayName || 'Loading profile'}</p>
                <p className="text-xs text-slate-500">{profileQuery.data?.role || 'USER'}</p>
              </div>
            </div>
            <button onClick={handleExport} className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50">
              Export CSV
            </button>
            <button onClick={handleLogout} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">
              Logout
            </button>
          </div>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Metric label="Income" value={totals.income} tone="green" detail="Total money received" />
          <Metric label="Expenses" value={totals.expense} tone="red" detail="Total money spent" />
          <Metric label="Balance" value={totals.balance} tone="slate" detail="Income minus expenses" />
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
          <form onSubmit={handleCreate} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-semibold tracking-tight">Add transaction</h2>
              <p className="mt-1 text-sm text-slate-500">Record income or expense activity.</p>
            </div>
            {formError && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
            <label className="mt-5 block text-sm font-medium text-slate-700">
              Title
              <input className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none placeholder:text-slate-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10" placeholder="Client payment" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Amount
              <input className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none placeholder:text-slate-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10" type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Type
              <select className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as TransactionType })}>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Category
              <input className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none placeholder:text-slate-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10" placeholder="Sales, rent, payroll" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
            </label>
            <button disabled={createMutation.isPending} className="mt-5 h-10 w-full rounded-md bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
              {createMutation.isPending ? 'Adding...' : 'Add transaction'}
            </button>
          </form>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Transactions</h2>
                <p className="mt-1 text-sm text-slate-500">Review, filter, and export ledger entries.</p>
              </div>
              <select className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10" value={type} onChange={(event) => { setType(event.target.value as 'ALL' | TransactionType); setPage(1); }}>
                <option value="ALL">All types</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactionQuery.data?.data.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-900">{transaction.title}</td>
                      <td className={`px-4 py-3 font-semibold ${transaction.type === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'}`}>Rs. {transaction.amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${transaction.type === 'INCOME' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'}`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{transaction.category}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(transaction.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteMutation.mutate(transaction.id)} className="rounded-md px-2 py-1 font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactionQuery.isLoading && <p className="p-6 text-sm text-slate-500">Loading transactions...</p>}
              {!transactionQuery.isLoading && transactionQuery.data?.data.length === 0 && <p className="p-6 text-sm text-slate-500">No transactions found.</p>}
            </div>
            <footer className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-slate-600">{transactionQuery.data?.total || 0} records</span>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                  Prev
                </button>
                <span className="min-w-14 text-center text-sm font-medium text-slate-600">{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                  Next
                </button>
              </div>
            </footer>
          </section>
        </section>
      </section>
    </main>
  );
}

function getInitials(name?: string) {
  if (!name) return 'U';

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'U';
}

function Metric({ label, value, tone, detail }: { label: string; value: number; tone: 'green' | 'red' | 'slate'; detail: string }) {
  const styles = {
    green: 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
    red: 'border-rose-200 bg-rose-50/70 text-rose-700',
    slate: 'border-slate-200 bg-white text-slate-950',
  }[tone];

  const valueClass = {
    green: 'text-emerald-700',
    red: 'text-rose-700',
    slate: 'text-slate-950',
  }[tone];

  return (
    <article className={`rounded-lg border p-5 shadow-sm ${styles}`}>
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-tight ${valueClass}`}>Rs. {value.toLocaleString('en-IN')}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </article>
  );
}
