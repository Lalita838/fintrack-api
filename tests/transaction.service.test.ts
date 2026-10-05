import assert from 'node:assert/strict';
import { test } from 'node:test';
import Database from 'better-sqlite3';
import { initializeDatabase } from '../src/database.js';
import {
  TransactionAuthorizationError,
  TransactionService,
  TransactionServiceError,
  TransactionValidationError,
} from '../src/services/transaction.service.js';

test('creates, retrieves, and deletes only the selected user transactions', () => {
  const database = new Database(':memory:');
  initializeDatabase(database);
  const service = new TransactionService(database);
  const userOne = { userId: 'user-1' };
  const userTwo = { userId: 'user-2' };

  try {
    const first = service.create({
      amount: 25.5,
      type: 'expense',
      category: 'food',
    }, userOne);
    service.create({
      amount: 100,
      type: 'income',
      category: 'salary',
    }, userTwo);

    assert.equal(first.userId, 'user-1');
    assert.equal(first.amount, 25.5);
    assert.equal(service.getByUser('user-1', userOne).total, 1);
    assert.equal(service.deleteAllForUser('user-1', userOne), 1);
    assert.deepEqual(service.getByUser('user-1', userOne).items, []);
    assert.equal(service.getByUser('user-2', userTwo).total, 1);
  } finally {
    database.close();
  }
});

test('paginates transactions and reports the total for the user', () => {
  const database = new Database(':memory:');
  initializeDatabase(database);
  const service = new TransactionService(database);
  const principal = { userId: 'user-1' };

  try {
    for (const amount of [10, 20, 30]) {
      service.create({ amount, type: 'expense', category: 'food' }, principal);
    }

    const page = service.getByUser('user-1', principal, { limit: 2, offset: 1 });
    assert.equal(page.total, 3);
    assert.equal(page.limit, 2);
    assert.equal(page.offset, 1);
    assert.deepEqual(page.items.map(({ amount }) => amount), [20, 10]);
  } finally {
    database.close();
  }
});

test('rejects invalid input and cross-user access', () => {
  const database = new Database(':memory:');
  initializeDatabase(database);
  const service = new TransactionService(database);

  try {
    assert.throws(
      () => service.create({ amount: -1, type: 'expense', category: 'food' }, { userId: 'user-1' }),
      TransactionValidationError,
    );
    assert.throws(
      () => service.create({
        amount: 1,
        type: 'expense',
        category: 'food',
        occurredAt: '2026-02-30',
      }, { userId: 'user-1' }),
      TransactionValidationError,
    );
    assert.throws(
      () => service.getByUser('user-2', { userId: 'user-1' }),
      TransactionAuthorizationError,
    );
    assert.throws(
      () => service.deleteAllForUser('user-2', { userId: 'user-1' }),
      TransactionAuthorizationError,
    );
  } finally {
    database.close();
  }
});

test('wraps database errors without exposing them as service messages', () => {
  const database = new Database(':memory:');
  initializeDatabase(database);
  const service = new TransactionService(database);
  database.close();

  assert.throws(
    () => service.getByUser('user-1', { userId: 'user-1' }),
    (error: unknown) => error instanceof TransactionServiceError &&
      error.message === 'Unable to retrieve transactions',
  );
});