"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.create = create;
exports.update = update;
exports.remove = remove;
exports.dashboard = dashboard;
exports.exportCsv = exportCsv;
const service = __importStar(require("../services/transaction.service"));
const zod_1 = require("zod");
const ListQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(10),
    type: zod_1.z.enum(['INCOME', 'EXPENSE']).optional(),
});
async function list(req, res) {
    const query = ListQuerySchema.parse(req.query);
    res.json(await service.listTransactions(req.user.orgId, query.page, query.limit, query.type));
}
async function create(req, res) {
    res.status(201).json(await service.addTransaction(req.user.orgId, req.body));
}
async function update(req, res) {
    await service.editTransaction(req.params.id, req.user.orgId, req.body);
    res.json({ message: 'Updated' });
}
async function remove(req, res) {
    await service.removeTransaction(req.params.id, req.user.orgId);
    res.json({ message: 'Deleted' });
}
async function dashboard(req, res) {
    res.json(await service.getDashboardData(req.user.orgId));
}
async function exportCsv(req, res) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    res.write('id,title,amount,type,category,createdAt\n');
    for await (const row of service.exportCSV(req.user.orgId)) {
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
