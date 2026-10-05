import assert from 'node:assert/strict';
import { test } from 'node:test';
import Database from 'better-sqlite3';
import { initializeDatabase } from '../src/database.js';
import { ExpenseSplittingController } from '../src/controllers/expense-splitting.controller.js';

function createRequest(
  method: string,
  path: string,
  body?: unknown,
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test('creates shared expenses and returns authenticated users their net balances', async () => {
  const database = new Database(':memory:');
  initializeDatabase(database);
  const controller = new ExpenseSplittingController(database, (request) => {
    const userId = request.headers.get('x-user-id');
    return userId ? { userId } : null;
  });

  try {
    const created = await controller.handle(new Request(
      'http://localhost/api/expenses/shared',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'creator',
        },
        body: JSON.stringify({
          description: 'Dinner',
          totalAmount: 10,
          splitType: 'equal',
          participants: [{ userId: 'creator' }, { userId: 'friend' }],
        }),
      },
    ));
    assert.equal(created.status, 201);
    const expense = await created.json() as {
      id: number;
      creatorId: string;
      participants: { userId: string; shareAmount: number }[];
    };
    assert.equal(expense.creatorId, 'creator');
    assert.deepEqual(expense.participants, [
      { userId: 'creator', shareAmount: 5 },
      { userId: 'friend', shareAmount: 5 },
    ]);

    const creatorBalances = await controller.handle(new Request(
      'http://localhost/api/users/creator/balances',
      { headers: { 'x-user-id': 'creator' } },
    ));
    assert.equal(creatorBalances.status, 200);
    assert.deepEqual(await creatorBalances.json(), {
      items: [{ userId: 'friend', amount: 5 }],
      total: 1,
      limit: 20,
      offset: 0,
    });

    const friendBalances = await controller.handle(new Request(
      'http://localhost/api/users/friend/balances',
      { headers: { 'x-user-id': 'friend' } },
    ));
    assert.equal(friendBalances.status, 200);
    assert.deepEqual(await friendBalances.json(), {
      items: [{ userId: 'creator', amount: -5 }],
      total: 1,
      limit: 20,
      offset: 0,
    });
  } finally {
    database.close();
  }
});

test('validates shared expenses and blocks unauthenticated and cross-user requests', async () => {
  const database = new Database(':memory:');
  initializeDatabase(database);
  const controller = new ExpenseSplittingController(database, (request) => {
    const userId = request.headers.get('x-user-id');
    return userId ? { userId } : null;
  });

  try {
    const unauthenticated = await controller.handle(createRequest(
      'POST',
      '/api/expenses/shared',
      {},
    ));
    assert.equal(unauthenticated.status, 401);

    const invalidSplit = await controller.handle(new Request(
      'http://localhost/api/expenses/shared',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'creator',
        },
        body: JSON.stringify({
          description: 'Dinner',
          totalAmount: 10,
          splitType: 'custom',
          participants: [{ userId: 'friend', shareAmount: 9 }],
        }),
      },
    ));
    assert.equal(invalidSplit.status, 400);
    assert.match((await invalidSplit.json()).error, /must sum to totalAmount/);

    const forbidden = await controller.handle(new Request(
      'http://localhost/api/users/another-user/balances',
      { headers: { 'x-user-id': 'creator' } },
    ));
    assert.equal(forbidden.status, 403);
  } finally {
    database.close();
  }
});

test('paginates balance counterparties', async () => {
  const database = new Database(':memory:');
  initializeDatabase(database);
  const controller = new ExpenseSplittingController(database, () => ({ userId: 'creator' }));

  try {
    for (const userId of ['user-1', 'user-2']) {
      const response = await controller.handle(createRequest(
        'POST',
        '/api/expenses/shared',
        {
          description: 'Shared item',
          totalAmount: 5,
          splitType: 'custom',
          participants: [{ userId, shareAmount: 5 }],
        },
      ));
      assert.equal(response.status, 201);
    }

    const response = await controller.handle(new Request(
      'http://localhost/api/users/creator/balances?limit=1&offset=1',
    ));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      items: [{ userId: 'user-2', amount: 5 }],
      total: 2,
      limit: 1,
      offset: 1,
    });
  } finally {
    database.close();
  }
});

test("rejects BOLA attempts to read another user's balances", async () => {
  const database = new Database(':memory:');
  initializeDatabase(database);
  const controller = new ExpenseSplittingController(database, () => ({ userId: 'attacker' }));

  try {
    const response = await controller.handle(new Request(
      'http://localhost/api/users/victim/balances',
    ));

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      error: 'Not authorized to access these shared expenses',
    });
  } finally {
    database.close();
  }
});
