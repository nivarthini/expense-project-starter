import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as service from '../services/transaction.service';
import { z } from 'zod';

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
});

export async function list(req: AuthRequest, res: Response) {
  const query = ListQuerySchema.parse(req.query);
  res.json(await service.listTransactions(req.user!.orgId, query.page, query.limit, query.type));
}
export async function create(req: AuthRequest, res: Response) {
  res.status(201).json(await service.addTransaction(req.user!.orgId, req.body));
}
export async function update(req: AuthRequest, res: Response) {
  await service.editTransaction(req.params.id, req.user!.orgId, req.body);
  res.json({ message: 'Updated' });
}
export async function remove(req: AuthRequest, res: Response) {
  await service.removeTransaction(req.params.id, req.user!.orgId);
  res.json({ message: 'Deleted' });
}
export async function dashboard(req: AuthRequest, res: Response) {
  res.json(await service.getDashboardData(req.user!.orgId));
}
export async function exportCsv(req: AuthRequest, res: Response) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
  res.write('id,title,amount,type,category,createdAt\n');
  for await (const row of service.exportCSV(req.user!.orgId)) {
    res.write([
      row.id,
      JSON.stringify(row.title),
      row.amount,
      row.type,
      JSON.stringify(row.category),
      row.createdAt.toISOString(),
    ].join(',') + '\n');
  }
  res.end();
}
