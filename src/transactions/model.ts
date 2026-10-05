export {
  type CreateTransactionInput,
  type Transaction,
  type TransactionType,
} from '../models/transaction.js';

import type { Transaction } from '../models/transaction.js';

export type TransactionRecord = Transaction;

export interface TransactionPage {
  items: TransactionRecord[];
  total: number;
  limit: number;
  offset: number;
}
