import * as repo from '../repositories/transaction.repository';
import { z } from 'zod';
const TransactionSchema = z.object({ title: z.string().min(1), amount: z.number().positive(), type: z.enum(['INCOME', 'EXPENSE']), category: z.string().min(1) });
export const listTransactions = (orgId: string, page = 1, limit = 10, type?: 'INCOME' | 'EXPENSE') => repo.getTransactions(orgId, page, limit, type);
export async function addTransaction(orgId: string, body: any) {
  return repo.createTransaction(orgId, TransactionSchema.parse(body));
}
export async function editTransaction(id: string, orgId: string, body: any) {
  return repo.updateTransaction(id, orgId, TransactionSchema.partial().parse(body));
}
export const removeTransaction = (id: string, orgId: string) => repo.deleteTransaction(id, orgId);
export const getDashboardData = (orgId: string) => repo.getDashboard(orgId);
export const exportCSV = (orgId: string) => repo.getAllTransactionsForExport(orgId);
