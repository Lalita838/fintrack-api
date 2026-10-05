import type { SharedExpense } from '../models/shared-expense.js';

const MAX_AMOUNT = 999_999_999.99;
const MAX_USER_ID_LENGTH = 255;

export class BalanceCalculationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BalanceCalculationValidationError';
  }
}

function validateUserId(userId: unknown, field: string): asserts userId is string {
  if (
    typeof userId !== 'string' ||
    !userId.trim() ||
    userId.length > MAX_USER_ID_LENGTH
  ) {
    throw new BalanceCalculationValidationError(
      `${field} must be a non-empty string of at most ${MAX_USER_ID_LENGTH} characters`,
    );
  }
}

function toCents(
  amount: unknown,
  field: string,
  allowZero: boolean,
): number {
  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    (!allowZero && amount === 0) ||
    amount > MAX_AMOUNT ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8
  ) {
    const minimum = allowZero ? 'non-negative' : 'positive';
    throw new BalanceCalculationValidationError(
      `${field} must be a ${minimum} amount with at most two decimal places and no more than ${MAX_AMOUNT}`,
    );
  }

  return Math.round(amount * 100);
}

function validateExpense(expense: unknown): asserts expense is SharedExpense {
  if (!expense || typeof expense !== 'object' || Array.isArray(expense)) {
    throw new BalanceCalculationValidationError('expense must be an object');
  }

  const candidate = expense as Partial<SharedExpense>;
  if (!Number.isSafeInteger(candidate.id) || candidate.id! < 1) {
    throw new BalanceCalculationValidationError('expense id must be a positive safe integer');
  }
  validateUserId(candidate.creatorId, 'creatorId');
  if (typeof candidate.description !== 'string' || !candidate.description.trim()) {
    throw new BalanceCalculationValidationError('description must be a non-empty string');
  }
  toCents(candidate.totalAmount, 'totalAmount', false);
  if (candidate.splitType !== 'equal' && candidate.splitType !== 'custom') {
    throw new BalanceCalculationValidationError('splitType must be equal or custom');
  }
  if (
    typeof candidate.createdAt !== 'string' ||
    !candidate.createdAt.trim() ||
    !Number.isFinite(Date.parse(candidate.createdAt))
  ) {
    throw new BalanceCalculationValidationError('createdAt must be a valid date or timestamp');
  }
  if (!Array.isArray(candidate.participants) || candidate.participants.length === 0) {
    throw new BalanceCalculationValidationError('participants must contain at least one participant');
  }

  const participantIds = new Set<string>();
  for (const [index, participant] of candidate.participants.entries()) {
    if (!participant || typeof participant !== 'object' || Array.isArray(participant)) {
      throw new BalanceCalculationValidationError(`participants[${index}] must be an object`);
    }
    validateUserId(participant.userId, `participants[${index}].userId`);
    if (participantIds.has(participant.userId)) {
      throw new BalanceCalculationValidationError(
        `participants must not contain duplicate userId "${participant.userId}"`,
      );
    }
    participantIds.add(participant.userId);
    toCents(participant.shareAmount, `participants[${index}].shareAmount`, true);
  }
}

export class BalanceCalculationService {
  calculateShares(expense: SharedExpense): SharedExpense['participants'] {
    validateExpense(expense);

    const totalCents = toCents(expense.totalAmount, 'totalAmount', false);
    if (expense.splitType === 'equal') {
      const baseShare = Math.floor(totalCents / expense.participants.length);
      const remainder = totalCents % expense.participants.length;

      return expense.participants.map((participant, index) => ({
        userId: participant.userId,
        shareAmount: (baseShare + (index < remainder ? 1 : 0)) / 100,
      }));
    }

    const customTotal = expense.participants.reduce(
      (sum, participant, index) =>
        sum + toCents(participant.shareAmount, `participants[${index}].shareAmount`, true),
      0,
    );
    if (customTotal !== totalCents) {
      throw new BalanceCalculationValidationError(
        `custom participant shares must sum to totalAmount (${expense.totalAmount.toFixed(2)})`,
      );
    }

    return expense.participants.map(({ userId, shareAmount }) => ({ userId, shareAmount }));
  }

  /** Positive balances are owed to the user; negative balances are owed by them. */
  computeNetBalances(expenses: readonly SharedExpense[]): Map<string, number> {
    if (!Array.isArray(expenses)) {
      throw new BalanceCalculationValidationError('expenses must be an array');
    }

    const balancesInCents = new Map<string, number>();
    const addBalance = (userId: string, amountCents: number): void => {
      balancesInCents.set(userId, (balancesInCents.get(userId) ?? 0) + amountCents);
    };

    expenses.forEach((expense, index) => {
      try {
        validateExpense(expense);
        const shares = this.calculateShares(expense);
        addBalance(expense.creatorId, toCents(expense.totalAmount, 'totalAmount', false));
        for (const participant of shares) {
          addBalance(
            participant.userId,
            -toCents(participant.shareAmount, 'shareAmount', true),
          );
        }
      } catch (error) {
        if (error instanceof BalanceCalculationValidationError) {
          throw new BalanceCalculationValidationError(`expenses[${index}]: ${error.message}`);
        }
        throw error;
      }
    });

    return new Map(
      [...balancesInCents.entries()]
        .sort(([firstUserId], [secondUserId]) => firstUserId.localeCompare(secondUserId))
        .map(([userId, amountCents]) => [userId, amountCents / 100]),
    );
  }
}
