import assert from 'node:assert/strict';
import { test } from 'node:test';
import Database from 'better-sqlite3';
import { initializeDatabase } from '../src/database.js';
import { TransactionController } from '../src/transactions/controller.js';
import { TransactionService } from '../src/transactions/service.js';

test('creates, paginates, deletes, and authorizes transaction HTTP requests', async () => {
  const database = new Database(':memory:');
  initializeDatabase(database);
  const controller = new TransactionController(
    new TransactionService(database),
    (request) => {
      const userId = request.headers.get('x-user-id');
      return userId ? { userId } : null;
    },
  );

  try {
    const create = (amount: number) => controller.handle(new Request(
      'http://localhost/api/users/alice/transactions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'alice',
        },
        body: JSON.stringify({ amount, type: 'expense', category: 'food' }),
      },
    ));

    assert.equal((await create(8)).status, 201);
    assert.equal((await create(12)).status, 201);

    const page = await controller.handle(new Request(
      'http://localhost/api/users/alice/transactions?limit=1&offset=1',
      { headers: { 'x-user-id': 'alice' } },
    ));
    assert.equal(page.status, 200);
    const pageBody = await page.json() as {
      items: {
        id: number;
        userId: string;
        amount: number;
        type: string;
        category: string;
        description: string | null;
        occurredAt: string;
        createdAt: string;
      }[];
      total: number;
      limit: number;
      offset: number;
    };
    assert.equal(pageBody.items.length, 1);
    assert.deepEqual({
      ...pageBody.items[0],
      occurredAt: undefined,
      createdAt: undefined,
    }, {
      id: 1,
      userId: 'alice',
      amount: 8,
      type: 'expense',
      category: 'food',
      description: null,
      occurredAt: undefined,
      createdAt: undefined,
    });
    assert.ok(Number.isFinite(Date.parse(pageBody.items[0].occurredAt)));
    assert.ok(Number.isFinite(Date.parse(pageBody.items[0].createdAt)));
    assert.deepEqual({
      total: pageBody.total,
      limit: pageBody.limit,
      offset: pageBody.offset,
    }, {
      total: 2,
      limit: 1,
      offset: 1,
    });

    const forbidden = await controller.handle(new Request(
      'http://localhost/api/users/alice/transactions',
      { headers: { 'x-user-id': 'mallory' } },
    ));
    assert.equal(forbidden.status, 403);

    const deleted = await controller.handle(new Request(
      'http://localhost/api/users/alice/transactions',
      { method: 'DELETE', headers: { 'x-user-id': 'alice' } },
    ));
    assert.deepEqual(await deleted.json(), { deleted: 2 });
  } finally {
    database.close();
  }
});
