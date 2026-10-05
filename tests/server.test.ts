import assert from 'node:assert/strict';
import { test } from 'node:test';
import Database from 'better-sqlite3';
import { createApiServer } from '../src/server.js';
import { initializeDatabase } from '../src/database.js';

test('serves authenticated HTTP requests and rejects missing credentials', async () => {
  const database = new Database(':memory:');
  initializeDatabase(database);
  const server = createApiServer(database, (request) =>
    request.headers.get('authorization') === 'Bearer test-api-token'
      ? { userId: 'demo-user' }
      : null,
  );
  server.listen(0, '127.0.0.1');

  try {
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const unauthorized = await fetch(`${baseUrl}/api/users/demo-user/balances`);
    assert.equal(unauthorized.status, 401);

    const created = await fetch(`${baseUrl}/api/expenses/shared`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-api-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Lunch',
        totalAmount: 12,
        splitType: 'equal',
        participants: [{ userId: 'demo-user' }, { userId: 'friend' }],
      }),
    });
    assert.equal(created.status, 201);

    const balances = await fetch(`${baseUrl}/api/users/demo-user/balances`, {
      headers: { Authorization: 'Bearer test-api-token' },
    });
    assert.equal(balances.status, 200);
    assert.deepEqual(await balances.json(), {
      items: [{ userId: 'friend', amount: 6 }],
      total: 1,
      limit: 20,
      offset: 0,
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    database.close();
  }
});
