export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: number;
  userId: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface CreateTransactionInput {
  amount: number;
  type: TransactionType;
  category: string;
  description?: string;
  occurredAt?: string;
}