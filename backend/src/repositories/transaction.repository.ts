import prisma from '../utils/prisma';
export async function getTransactions(orgId: string, page: number, limit: number, type?: 'INCOME' | 'EXPENSE') {
  const skip = (page - 1) * limit;
  const where = type ? { orgId, type } : { orgId };
  const [data, total] = await prisma.$transaction([
    prisma.transaction.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.transaction.count({ where })
  ]);
  return { data, total, page, limit };
}
export async function createTransaction(orgId: string, body: any) {
  return prisma.$transaction((tx) => tx.transaction.create({ data: { ...body, orgId } }));
}
export async function updateTransaction(id: string, orgId: string, body: any) {
  return prisma.$transaction((tx) => tx.transaction.updateMany({ where: { id, orgId }, data: body }));
}
export async function deleteTransaction(id: string, orgId: string) {
  return prisma.$transaction((tx) => tx.transaction.deleteMany({ where: { id, orgId } }));
}
export async function getDashboard(orgId: string) {
  return prisma.transaction.groupBy({ by: ['type'], where: { orgId }, _sum: { amount: true } });
}
export async function* getAllTransactionsForExport(orgId: string) {
  let cursor: string | undefined;

  while (true) {
    const rows = await prisma.transaction.findMany({
      where: { orgId },
      take: 500,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    if (rows.length === 0) return;
    for (const row of rows) yield row;
    cursor = rows[rows.length - 1].id;
  }
}
