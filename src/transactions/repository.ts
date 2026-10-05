import type Database from 'better-sqlite3';
import type {
  CreateTransactionInput,
  TransactionPage,
  TransactionRecord,
} from './model.js';

interface TransactionRow {
  id: number;
  user_id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string | null;
  occurred_at: string;
  created_at: string;
}

function toTransaction(row: TransactionRow): TransactionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    amount: row.amount,
    type: row.type,
    category: row.category,
    description: row.description,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}

export class TransactionRepository {
  constructor(private readonly database: Database.Database) {}

  create(
    userId: string,
    input: CreateTransactionInput,
    occurredAt: string,
    createdAt: string,
  ): TransactionRecord {
    const result = this.database.prepare(`
      INSERT INTO transactions
        (user_id, amount, type, category, description, occurred_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      input.amount,
      input.type,
      input.category.trim(),
      input.description ?? null,
      occurredAt,
      createdAt,
    );
    const row = this.database.prepare(
      'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
    ).get(result.lastInsertRowid, userId) as TransactionRow | undefined;
    if (!row) throw new Error('Inserted transaction could not be read');
    return toTransaction(row);
  }

  getByUser(userId: string, limit: number, offset: number): TransactionPage {
    const total = (this.database.prepare(
      'SELECT COUNT(*) AS total FROM transactions WHERE user_id = ?',
    ).get(userId) as { total: number }).total;
    const rows = this.database.prepare(`
      SELECT * FROM transactions
      WHERE user_id = ?
      ORDER BY occurred_at DESC, id DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset) as TransactionRow[];
    return { items: rows.map(toTransaction), total, limit, offset };
  }

  deleteAllForUser(userId: string): number {
    return this.database.prepare(
      'DELETE FROM transactions WHERE user_id = ?',
    ).run(userId).changes;
  }
}
