import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SharedExpense } from '../src/models/shared-expense.js';
import {
  BalanceCalculationService,
  BalanceCalculationValidationError,
} from '../src/services/balance-calculation.service.js';

function createExpense(
  splitType: SharedExpense['splitType'],
  participants: SharedExpense['participants'],
  totalAmount = 10,
): SharedExpense {
  return {
    id: 1,
    creatorId: 'creator',
    description: 'Dinner',
    totalAmount,
    splitType,
    createdAt: '2026-10-05T08:00:00.000Z',
    participants,
  };
}

test('calculates equal shares in cents and handles one participant', () => {
  const service = new BalanceCalculationService();
  const expense = createExpense('equal', [
    { userId: 'user-1', shareAmount: 0 },
    { userId: 'user-2', shareAmount: 0 },
    { userId: 'user-3', shareAmount: 0 },
  ]);

  assert.deepEqual(service.calculateShares(expense), [
    { userId: 'user-1', shareAmount: 3.34 },
    { userId: 'user-2', shareAmount: 3.33 },
    { userId: 'user-3', shareAmount: 3.33 },
  ]);
  assert.deepEqual(service.calculateShares(
    createExpense('equal', [{ userId: 'user-1', shareAmount: 0 }]),
  ), [{ userId: 'user-1', shareAmount: 10 }]);
  assert.deepEqual(service.calculateShares(
    createExpense('custom', [{ userId: 'user-1', shareAmount: 10 }]),
  ), [{ userId: 'user-1', shareAmount: 10 }]);
});

test('validates custom shares and computes net balances across expenses', () => {
  const service = new BalanceCalculationService();
  const expenses = [
    createExpense('custom', [
      { userId: 'creator', shareAmount: 2 },
      { userId: 'user-1', shareAmount: 8 },
    ]),
    {
      ...createExpense('equal', [
        { userId: 'user-1', shareAmount: 0 },
        { userId: 'user-2', shareAmount: 0 },
      ], 6),
      id: 2,
      creatorId: 'user-2',
    },
  ];

  assert.deepEqual(service.calculateShares(expenses[0]), [
    { userId: 'creator', shareAmount: 2 },
    { userId: 'user-1', shareAmount: 8 },
  ]);
  assert.deepEqual(service.computeNetBalances(expenses), new Map([
    ['creator', 8],
    ['user-1', -11],
    ['user-2', 3],
  ]));
  assert.deepEqual(service.computeNetBalances([]), new Map());
});

test('rejects malformed expenses and custom shares that do not add up', () => {
  const service = new BalanceCalculationService();

  assert.throws(
    () => service.calculateShares(createExpense('custom', [
      { userId: 'user-1', shareAmount: 9.99 },
    ])),
    (error: unknown) => error instanceof BalanceCalculationValidationError &&
      error.message.includes('must sum to totalAmount'),
  );
  assert.throws(
    () => service.calculateShares(createExpense('equal', [
      { userId: 'user-1', shareAmount: 0 },
      { userId: 'user-1', shareAmount: 0 },
    ])),
    (error: unknown) => error instanceof BalanceCalculationValidationError &&
      error.message.includes('duplicate userId'),
  );
  assert.throws(
    () => service.computeNetBalances([{
      ...createExpense('equal', [{ userId: 'user-1', shareAmount: 0 }]),
      totalAmount: Number.NaN,
    }]),
    (error: unknown) => error instanceof BalanceCalculationValidationError &&
      error.message.startsWith('expenses[0]:'),
  );
});
