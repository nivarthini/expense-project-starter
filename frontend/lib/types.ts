export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  createdAt: string;
}

export interface PaginatedTransactions {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
}

export interface DashboardItem {
  type: TransactionType;
  _sum: { amount: number | null };
}

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'USER';
  organization: {
    id: string;
    name: string;
  };
}
