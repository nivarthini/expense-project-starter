"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactions = getTransactions;
exports.createTransaction = createTransaction;
exports.updateTransaction = updateTransaction;
exports.deleteTransaction = deleteTransaction;
exports.getDashboard = getDashboard;
exports.getAllTransactionsForExport = getAllTransactionsForExport;
const prisma_1 = __importDefault(require("../utils/prisma"));
async function getTransactions(orgId, page, limit, type) {
    const skip = (page - 1) * limit;
    const where = type ? { orgId, type } : { orgId };
    const [data, total] = await prisma_1.default.$transaction([
        prisma_1.default.transaction.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma_1.default.transaction.count({ where })
    ]);
    return { data, total, page, limit };
}
async function createTransaction(orgId, body) {
    return prisma_1.default.$transaction((tx) => tx.transaction.create({ data: { ...body, orgId } }));
}
async function updateTransaction(id, orgId, body) {
    return prisma_1.default.$transaction((tx) => tx.transaction.updateMany({ where: { id, orgId }, data: body }));
}
async function deleteTransaction(id, orgId) {
    return prisma_1.default.$transaction((tx) => tx.transaction.deleteMany({ where: { id, orgId } }));
}
async function getDashboard(orgId) {
    return prisma_1.default.transaction.groupBy({ by: ['type'], where: { orgId }, _sum: { amount: true } });
}
async function* getAllTransactionsForExport(orgId) {
    let cursor;
    while (true) {
        const rows = await prisma_1.default.transaction.findMany({
            where: { orgId },
            take: 500,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });
        if (rows.length === 0)
            return;
        for (const row of rows)
            yield row;
        cursor = rows[rows.length - 1].id;
    }
}
