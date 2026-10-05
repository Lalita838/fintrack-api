import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';

export function initializeDatabase(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      category TEXT NOT NULL,
      description TEXT,
      occurred_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_user_occurred
      ON transactions (user_id, occurred_at DESC);

    CREATE TABLE IF NOT EXISTS shared_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_id TEXT NOT NULL,
      description TEXT NOT NULL,
      total_amount REAL NOT NULL CHECK (total_amount > 0),
      split_type TEXT NOT NULL CHECK (split_type IN ('equal', 'custom')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shared_expense_participants (
      expense_id INTEGER NOT NULL REFERENCES shared_expenses(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      share_amount REAL NOT NULL CHECK (share_amount >= 0),
      PRIMARY KEY (expense_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_shared_expenses_creator
      ON shared_expenses (creator_id);
    CREATE INDEX IF NOT EXISTS idx_shared_expense_participants_user
      ON shared_expense_participants (user_id, expense_id);
  `);
}

export function createDatabase(
  filename = process.env.DATABASE_PATH ?? './data/fintrack.sqlite',
): Database.Database {
  if (filename !== ':memory:') {
    mkdirSync(dirname(resolve(filename)), { recursive: true });
  }

  const database = new Database(filename);
  initializeDatabase(database);
  return database;
}