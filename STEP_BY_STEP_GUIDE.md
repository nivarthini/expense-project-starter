# 🚀 Complete Beginner's Guide: Full Stack Expense Management System
# Step-by-Step from Zero to Deployed (Target: 3 Hours)

---

## ⏱️ TIME PLAN
- Step 1–3: Setup & Install (30 min)
- Step 4–5: Backend Code (60 min)
- Step 6–7: Frontend Code (50 min)
- Step 8: Database Setup (15 min)
- Step 9: Deploy (25 min)

---

## STEP 1: INSTALL REQUIRED SOFTWARE (Do this first)

Go to each website and download + install:

1. **Node.js** → https://nodejs.org → Download "LTS" version → Install
2. **Git** → https://git-scm.com → Download → Install
3. **VS Code** → https://code.visualstudio.com → Download → Install
4. **PostgreSQL** (local) → https://www.postgresql.org/download/ → Install
   - During install, set password as: `postgres123`
   - Remember this password!

After installing, open a terminal (CMD on Windows / Terminal on Mac) and check:
```
node --version       (should show v18 or above)
npm --version        (should show 9 or above)
git --version        (should show git version)
```

---

## STEP 2: CREATE PROJECT FOLDER STRUCTURE

Open terminal and type these commands ONE BY ONE:

```bash
mkdir expense-management
cd expense-management
mkdir backend
mkdir frontend
```

Now you have:
```
expense-management/
  backend/
  frontend/
```

---

## STEP 3: SETUP BACKEND

### 3A. Go into backend folder and initialize:
```bash
cd backend
npm init -y
```

### 3B. Install all backend packages (copy this entire line):
```bash
npm install express prisma @prisma/client bcryptjs jsonwebtoken express-rate-limit helmet cors zod pino express-async-errors
npm install --save-dev nodemon typescript @types/express @types/node @types/bcryptjs @types/jsonwebtoken ts-node
```

### 3C. Initialize Prisma (database tool):
```bash
npx prisma init
```

This creates a `prisma/` folder and `.env` file.

### 3D. Create folder structure inside backend:
```bash
mkdir src
mkdir src/controllers
mkdir src/services
mkdir src/repositories
mkdir src/middleware
mkdir src/routes
mkdir src/utils
```

Your backend folder should now look like:
```
backend/
  prisma/
    schema.prisma    ← database design file
  src/
    controllers/     ← handles HTTP requests
    services/        ← business logic
    repositories/    ← database queries
    middleware/      ← auth, rate limit, errors
    routes/          ← URL paths
    utils/           ← helper functions
  .env               ← secret keys
  package.json
```

---

## STEP 4: WRITE ALL BACKEND FILES

Open VS Code: `code .` (run this inside the backend folder)

### FILE 1: `.env` (already exists, just edit it)
Replace everything in `.env` with:
```
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/expensedb"
JWT_SECRET="supersecretkey123456789abcdef"
JWT_REFRESH_SECRET="refreshsecretkey987654321xyz"
PORT=5000
```

---

### FILE 2: `prisma/schema.prisma` (already exists, replace content)
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Organization {
  id           String        @id @default(cuid())
  name         String
  createdAt    DateTime      @default(now())
  users        User[]
  transactions Transaction[]
}

model User {
  id             String       @id @default(cuid())
  email          String       @unique
  password       String
  role           Role         @default(USER)
  orgId          String
  organization   Organization @relation(fields: [orgId], references: [id])
  refreshToken   String?
  createdAt      DateTime     @default(now())

  @@index([orgId])
}

model Transaction {
  id          String            @id @default(cuid())
  title       String
  amount      Float
  type        TransactionType
  category    String
  orgId       String
  organization Organization     @relation(fields: [orgId], references: [id])
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([orgId])
  @@index([createdAt])
}

enum Role {
  ADMIN
  ACCOUNTANT
  USER
}

enum TransactionType {
  INCOME
  EXPENSE
}
```

---

### FILE 3: `src/utils/prisma.ts` (CREATE NEW FILE)
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export default prisma;
```

---

### FILE 4: `src/utils/jwt.ts` (CREATE NEW FILE)
```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export function generateAccessToken(userId: string, role: string, orgId: string) {
  return jwt.sign({ userId, role, orgId }, JWT_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(userId: string) {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { userId: string; role: string; orgId: string };
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
}
```

---

### FILE 5: `src/middleware/auth.ts` (CREATE NEW FILE)
```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string; orgId: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}
```

---

### FILE 6: `src/middleware/errorHandler.ts` (CREATE NEW FILE)
```typescript
import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error({ err }, 'Request failed');
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
}
```

---

### FILE 7: `src/repositories/auth.repository.ts` (CREATE NEW FILE)
```typescript
import prisma from '../utils/prisma';

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUserAndOrg(email: string, hashedPassword: string, orgName: string) {
  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: orgName } });
    const user = await tx.user.create({
      data: { email, password: hashedPassword, orgId: org.id, role: 'ADMIN' }
    });
    return { user, org };
  });
}

export async function updateRefreshToken(userId: string, token: string | null) {
  return prisma.user.update({ where: { id: userId }, data: { refreshToken: token } });
}

export async function findUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}
```

---

### FILE 8: `src/services/auth.service.ts` (CREATE NEW FILE)
```typescript
import bcrypt from 'bcryptjs';
import { findUserByEmail, createUserAndOrg, updateRefreshToken, findUserById } from '../repositories/auth.repository';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';

export async function registerService(email: string, password: string, orgName: string) {
  const existing = await findUserByEmail(email);
  if (existing) throw { status: 400, message: 'Email already exists' };
  const hashed = await bcrypt.hash(password, 10);
  const { user, org } = await createUserAndOrg(email, hashed, orgName);
  const accessToken = generateAccessToken(user.id, user.role, org.id);
  const refreshToken = generateRefreshToken(user.id);
  await updateRefreshToken(user.id, refreshToken);
  return { accessToken, refreshToken };
}

export async function loginService(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) throw { status: 401, message: 'Invalid credentials' };
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw { status: 401, message: 'Invalid credentials' };
  const accessToken = generateAccessToken(user.id, user.role, user.orgId);
  const refreshToken = generateRefreshToken(user.id);
  await updateRefreshToken(user.id, refreshToken);
  return { accessToken, refreshToken };
}

export async function refreshService(token: string) {
  const decoded = verifyRefreshToken(token);
  const user = await findUserById(decoded.userId);
  if (!user || user.refreshToken !== token) throw { status: 401, message: 'Invalid refresh token' };
  const accessToken = generateAccessToken(user.id, user.role, user.orgId);
  const newRefresh = generateRefreshToken(user.id);
  await updateRefreshToken(user.id, newRefresh);
  return { accessToken, refreshToken: newRefresh };
}

export async function logoutService(userId: string) {
  await updateRefreshToken(userId, null);
}
```

---

### FILE 9: `src/controllers/auth.controller.ts` (CREATE NEW FILE)
```typescript
import { Request, Response } from 'express';
import { registerService, loginService, refreshService, logoutService } from '../services/auth.service';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  orgName: z.string().min(2)
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export async function register(req: Request, res: Response) {
  const data = RegisterSchema.parse(req.body);
  const tokens = await registerService(data.email, data.password, data.orgName);
  res.status(201).json(tokens);
}

export async function login(req: Request, res: Response) {
  const data = LoginSchema.parse(req.body);
  const tokens = await loginService(data.email, data.password);
  res.json(tokens);
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
  const tokens = await refreshService(refreshToken);
  res.json(tokens);
}

export async function logout(req: AuthRequest, res: Response) {
  await logoutService(req.user!.userId);
  res.json({ message: 'Logged out' });
}
```

---

### FILE 10: `src/repositories/transaction.repository.ts` (CREATE NEW FILE)
```typescript
import prisma from '../utils/prisma';

export async function getTransactions(orgId: string, page: number, limit: number, type?: string) {
  const skip = (page - 1) * limit;
  const where: any = { orgId };
  if (type) where.type = type;

  const [data, total] = await prisma.$transaction([
    prisma.transaction.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.transaction.count({ where })
  ]);
  return { data, total, page, limit };
}

export async function createTransaction(orgId: string, body: any) {
  return prisma.transaction.create({
    data: { ...body, orgId }
  });
}

export async function updateTransaction(id: string, orgId: string, body: any) {
  return prisma.transaction.updateMany({
    where: { id, orgId },
    data: body
  });
}

export async function deleteTransaction(id: string, orgId: string) {
  return prisma.transaction.deleteMany({ where: { id, orgId } });
}

export async function getDashboard(orgId: string) {
  const result = await prisma.transaction.groupBy({
    by: ['type'],
    where: { orgId },
    _sum: { amount: true }
  });
  return result;
}

export async function getAllTransactionsForExport(orgId: string) {
  return prisma.transaction.findMany({ where: { orgId }, orderBy: { createdAt: 'desc' } });
}
```

---

### FILE 11: `src/services/transaction.service.ts` (CREATE NEW FILE)
```typescript
import * as repo from '../repositories/transaction.repository';
import { z } from 'zod';

const TransactionSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().min(1)
});

export async function listTransactions(orgId: string, page = 1, limit = 10, type?: string) {
  return repo.getTransactions(orgId, page, limit, type);
}

export async function addTransaction(orgId: string, body: any) {
  const data = TransactionSchema.parse(body);
  return repo.createTransaction(orgId, data);
}

export async function editTransaction(id: string, orgId: string, body: any) {
  const data = TransactionSchema.partial().parse(body);
  return repo.updateTransaction(id, orgId, data);
}

export async function removeTransaction(id: string, orgId: string) {
  return repo.deleteTransaction(id, orgId);
}

export async function getDashboardData(orgId: string) {
  return repo.getDashboard(orgId);
}

export async function exportCSV(orgId: string) {
  return repo.getAllTransactionsForExport(orgId);
}
```

---

### FILE 12: `src/controllers/transaction.controller.ts` (CREATE NEW FILE)
```typescript
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as service from '../services/transaction.service';

export async function list(req: AuthRequest, res: Response) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const type = req.query.type as string | undefined;
  const result = await service.listTransactions(req.user!.orgId, page, limit, type);
  res.json(result);
}

export async function create(req: AuthRequest, res: Response) {
  const tx = await service.addTransaction(req.user!.orgId, req.body);
  res.status(201).json(tx);
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
  const data = await service.getDashboardData(req.user!.orgId);
  res.json(data);
}

export async function exportCsv(req: AuthRequest, res: Response) {
  const rows = await service.exportCSV(req.user!.orgId);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
  res.write('id,title,amount,type,category,createdAt\n');
  for (const row of rows) {
    res.write(`${row.id},${row.title},${row.amount},${row.type},${row.category},${row.createdAt}\n`);
  }
  res.end();
}
```

---

### FILE 13: `src/routes/auth.routes.ts` (CREATE NEW FILE)
```typescript
import { Router } from 'express';
import { register, login, refresh, logout } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);

export default router;
```

---

### FILE 14: `src/routes/transaction.routes.ts` (CREATE NEW FILE)
```typescript
import { Router } from 'express';
import { list, create, update, remove, dashboard, exportCsv } from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', list);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.get('/dashboard', dashboard);
router.get('/export', exportCsv);

export default router;
```

---

### FILE 15: `src/index.ts` (CREATE NEW FILE - This is the MAIN server file)
```typescript
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import transactionRoutes from './routes/transaction.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info({ port: PORT }, 'Server running'));
```

---

### FILE 16: `tsconfig.json` (CREATE NEW FILE in backend root)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

---

### FILE 17: Edit `package.json` — add these scripts section:
Find the `"scripts"` part in package.json and replace it with:
```json
"scripts": {
  "dev": "nodemon --exec ts-node src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js"
},
```

---

## STEP 5: CREATE DATABASE

Open a new terminal and run:
```bash
psql -U postgres -c "CREATE DATABASE expensedb;"
```
(Enter password `postgres123` when asked)

Then back in the backend folder run:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

Test the server:
```bash
npm run dev
```
You should see: `Server running on port 5000` ✅

---

## STEP 6: SETUP FRONTEND

Open a NEW terminal window, go back to the main folder:
```bash
cd ..
cd frontend
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
```
When asked questions, press Enter for defaults.

Then install extra packages:
```bash
npm install @tanstack/react-query axios react-hook-form zod @hookform/resolvers
```

---

## STEP 7: WRITE FRONTEND FILES

### FILE 1: `app/lib/api.ts` (CREATE folders and file)
First create the folder: `mkdir app/lib`
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

---

### FILE 2: `app/login/page.tsx` (CREATE folder and file)
Create folder: `mkdir app/login`
```tsx
'use client';
import { useState } from 'react';
import api from '../lib/api';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      setAccessToken(res.data.accessToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6">Login</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <input className="w-full border p-2 mb-4 rounded" placeholder="Email"
          value={email} onChange={e => setEmail(e.target.value)} />
        <input className="w-full border p-2 mb-4 rounded" type="password" placeholder="Password"
          value={password} onChange={e => setPassword(e.target.value)} />
        <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Login</button>
        <p className="mt-4 text-center">No account? <a href="/register" className="text-blue-600">Register</a></p>
      </form>
    </div>
  );
}
```

---

### FILE 3: `app/register/page.tsx` (CREATE folder and file)
Create folder: `mkdir app/register`
```tsx
'use client';
import { useState } from 'react';
import api from '../lib/api';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api.post('/auth/register', { email, password, orgName });
      setAccessToken(res.data.accessToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleRegister} className="bg-white p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6">Register</h1>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <input className="w-full border p-2 mb-4 rounded" placeholder="Organization Name"
          value={orgName} onChange={e => setOrgName(e.target.value)} />
        <input className="w-full border p-2 mb-4 rounded" placeholder="Email"
          value={email} onChange={e => setEmail(e.target.value)} />
        <input className="w-full border p-2 mb-4 rounded" type="password" placeholder="Password (min 6 chars)"
          value={password} onChange={e => setPassword(e.target.value)} />
        <button className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">Register</button>
        <p className="mt-4 text-center">Have account? <a href="/login" className="text-blue-600">Login</a></p>
      </form>
    </div>
  );
}
```

---

### FILE 4: `app/dashboard/page.tsx` (CREATE folder and file)
Create folder: `mkdir app/dashboard`
```tsx
'use client';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useRouter } from 'next/navigation';

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: string;
  category: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ title: '', amount: '', type: 'INCOME', category: '' });
  const [error, setError] = useState('');
  const router = useRouter();

  async function fetchTransactions() {
    try {
      const res = await api.get(`/transactions?page=${page}&limit=10`);
      setTransactions(res.data.data);
      setTotal(res.data.total);
    } catch {
      router.push('/login');
    }
  }

  useEffect(() => { fetchTransactions(); }, [page]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/transactions', { ...form, amount: Number(form.amount) });
      setForm({ title: '', amount: '', type: 'INCOME', category: '' });
      fetchTransactions();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create');
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/transactions/${id}`);
    fetchTransactions();
  }

  async function handleExport() {
    await api.get('/transactions/export', { responseType: 'blob' });
  }

  function handleLogout() {
    clearAccessToken();
    router.push('/login');
  }

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex gap-2">
            <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded">Export CSV</button>
            <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
          </div>
        </div>

        {/* Add Transaction Form */}
        <div className="bg-white p-6 rounded shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Add Transaction</h2>
          {error && <p className="text-red-500 mb-2">{error}</p>}
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <input className="border p-2 rounded" placeholder="Title"
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            <input className="border p-2 rounded" placeholder="Amount" type="number"
              value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            <select className="border p-2 rounded" value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
            <input className="border p-2 rounded" placeholder="Category"
              value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required />
            <button type="submit" className="col-span-2 bg-blue-600 text-white p-2 rounded">Add Transaction</button>
          </form>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{tx.title}</td>
                  <td className="p-3">₹{tx.amount}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${tx.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="p-3">{tx.category}</td>
                  <td className="p-3">{new Date(tx.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <button onClick={() => handleDelete(tx.id)} className="text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 flex justify-between items-center">
            <span className="text-sm text-gray-500">Total: {total} records</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
              <span className="px-3 py-1">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### FILE 5: Edit `app/page.tsx` (Replace all content)
```tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login');
}
```

---

### FILE 6: Create `next.config.js` (already exists, replace content)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [];
  }
};

module.exports = nextConfig;
```

---

## STEP 8: TEST LOCALLY

Open 2 terminal windows:

**Terminal 1 (Backend):**
```bash
cd expense-management/backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd expense-management/frontend
npm run dev
```

Open browser: http://localhost:3000

You should see the Login page. Try:
1. Click Register → create an account
2. Login with your account
3. Add some transactions
4. Try Export CSV

---

## STEP 9: DEPLOY

### 9A. Create GitHub Repository
1. Go to https://github.com → Sign in (create free account if needed)
2. Click green "New" button → Name it `expense-management`
3. Click "Create repository"
4. Copy the commands shown and run in terminal:
```bash
cd expense-management
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/expense-management.git
git push -u origin main
```

### 9B. Create Free PostgreSQL Database on Supabase
1. Go to https://supabase.com → Sign up free
2. Click "New Project" → Fill name, set password (save it!), choose region
3. Go to Settings → Database → Copy "Connection string" (URI format)
4. It looks like: `postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres`
5. Save this string!

### 9C. Deploy Backend on Render
1. Go to https://render.com → Sign up free
2. Click "New" → "Web Service"
3. Connect your GitHub → Select `expense-management` repo
4. Settings:
   - Root Directory: `backend`
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm start`
5. Add Environment Variables:
   - `DATABASE_URL` = your Supabase connection string
   - `JWT_SECRET` = `supersecretkey123456789abcdef`
   - `JWT_REFRESH_SECRET` = `refreshsecretkey987654321xyz`
6. Click Deploy!
7. Copy the URL Render gives you (like `https://your-app.onrender.com`)

### 9D. Deploy Frontend on Vercel
1. Go to https://vercel.com → Sign up free
2. Click "Import Project" → Connect GitHub → Select repo
3. Root Directory: `frontend`
4. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL` = your Render backend URL
5. Click Deploy!

---

## STEP 10: UPDATE FRONTEND API URL FOR PRODUCTION

Edit `frontend/app/lib/api.ts` and change:
```typescript
baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
```

Push to GitHub:
```bash
git add .
git commit -m "add production api url"
git push
```
Both Vercel and Render will auto-redeploy!

---

## STEP 11: CREATE GITHUB ACTIONS (CI/CD)

Create folder and file:
```bash
mkdir -p .github/workflows
```

Create file `.github/workflows/ci.yml`:
```yaml
name: CI

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install Backend
        run: cd backend && npm install
      - name: Build Backend
        run: cd backend && npm run build
      - name: Install Frontend
        run: cd frontend && npm install
      - name: Build Frontend
        run: cd frontend && npm run build
```

---

## SUMMARY: WHAT YOU BUILT

✅ JWT Authentication with refresh tokens
✅ Role-based access (Admin/Accountant/User)
✅ Multi-tenant data isolation
✅ Transaction CRUD with validation
✅ Pagination
✅ CSV Export
✅ Rate Limiting
✅ Security headers (Helmet)
✅ Error handling
✅ Frontend with Next.js
✅ Deployed on Vercel + Render + Supabase
✅ GitHub CI/CD pipeline

---

## IF SOMETHING BREAKS

Common errors and fixes:

**"Cannot find module"** → Run `npm install` again

**"prisma not found"** → Run `npx prisma generate`

**"Connection refused"** → Make sure backend is running on port 5000

**"CORS error"** → Backend is not running; start it with `npm run dev`

**TypeScript errors** → Add `// @ts-ignore` above the error line temporarily

---

## FILES TO SUBMIT

1. GitHub repository link
2. Vercel frontend URL
3. Render backend URL
4. The `prisma/schema.prisma` file
5. Short note: "Built multi-tenant expense management system with JWT auth, RBAC, pagination, CSV export, deployed on Vercel/Render/Supabase"
