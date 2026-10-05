import type Database from 'better-sqlite3';
import { TransactionRepository } from './repository.js';
import type {
  CreateTransactionInput,
  Transaction,
  TransactionType,
} from '../models/transaction.js';

export interface AuthenticatedPrincipal {
  userId: string;
}

export interface TransactionPagination {
  limit?: number;
  offset?: number;
}

export interface TransactionPage {
  items: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

export class TransactionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionValidationError';
  }
}

export class TransactionAuthorizationError extends Error {
  constructor() {
    super('Not authorized to access these transactions');
    this.name = 'TransactionAuthorizationError';
  }
}

export class TransactionServiceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TransactionServiceError';
  }
}

const MAX_AMOUNT = 999_999_999.99;
const MAX_CATEGORY_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1_000;
const MAX_USER_ID_LENGTH = 255;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function validatePrincipal(principal: AuthenticatedPrincipal): string {
  if (
    !principal ||
    typeof principal.userId !== 'string' ||
    !principal.userId.trim() ||
    principal.userId.length > MAX_USER_ID_LENGTH
  ) {
    throw new TransactionAuthorizationError();
  }

  return principal.userId;
}

function validateUserId(userId: string): void {
  if (
    typeof userId !== 'string' ||
    !userId.trim() ||
    userId.length > MAX_USER_ID_LENGTH
  ) {
    throw new TransactionValidationError('userId must be a non-empty string');
  }
}

function validateOccurredAt(occurredAt: unknown): string {
  if (occurredAt === undefined) {
    return new Date().toISOString();
  }

  if (
    typeof occurredAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(occurredAt)
  ) {
    throw new TransactionValidationError('occurredAt must be an ISO 8601 date or timestamp');
  }

  const datePart = occurredAt.slice(0, 10);
  const calendarDate = Date.parse(`${datePart}T00:00:00.000Z`);
  if (
    !Number.isFinite(calendarDate) ||
    new Date(calendarDate).toISOString().slice(0, 10) !== datePart
  ) {
    throw new TransactionValidationError('occurredAt must contain a valid calendar date');
  }

  const timestamp = Date.parse(occurredAt);
  if (!Number.isFinite(timestamp)) {
    throw new TransactionValidationError('occurredAt must be a valid date');
  }

  return new Date(timestamp).toISOString();
}

export class TransactionService {
  private readonly repository: TransactionRepository;

  constructor(database: Database.Database) {
    this.repository = new TransactionRepository(database);
  }

  create(
    input: CreateTransactionInput,
    principal: AuthenticatedPrincipal,
  ): Transaction {
    const userId = validatePrincipal(principal);
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new TransactionValidationError('transaction input must be an object');
    }
    if (
      typeof input.amount !== 'number' ||
      !Number.isFinite(input.amount) ||
      input.amount <= 0 ||
      input.amount > MAX_AMOUNT ||
      Math.abs(input.amount * 100 - Math.round(input.amount * 100)) > 1e-8
    ) {
      throw new TransactionValidationError('amount must be a positive value with at most two decimal places');
    }
    if (input.type !== 'income' && input.type !== 'expense') {
      throw new TransactionValidationError('type must be income or expense');
    }
    if (
      typeof input.category !== 'string' ||
      !input.category.trim() ||
      input.category.trim().length > MAX_CATEGORY_LENGTH
    ) {
      throw new TransactionValidationError(`category must be a non-empty string of at most ${MAX_CATEGORY_LENGTH} characters`);
    }
    if (
      input.description !== undefined &&
      (typeof input.description !== 'string' || input.description.length > MAX_DESCRIPTION_LENGTH)
    ) {
      throw new TransactionValidationError(`description must be a string of at most ${MAX_DESCRIPTION_LENGTH} characters`);
    }

    const occurredAt = validateOccurredAt(input.occurredAt);

    const createdAt = new Date().toISOString();
    try {
      return this.repository.create(userId, input, occurredAt, createdAt);
    } catch (error) {
      throw new TransactionServiceError('Unable to create transaction', { cause: error });
    }
  }

  getByUser(
    userId: string,
    principal: AuthenticatedPrincipal,
    pagination: TransactionPagination = {},
  ): TransactionPage {
    const principalUserId = validatePrincipal(principal);
    validateUserId(userId);
    if (principalUserId !== userId) {
      throw new TransactionAuthorizationError();
    }
    if (!pagination || typeof pagination !== 'object' || Array.isArray(pagination)) {
      throw new TransactionValidationError('pagination must be an object');
    }

    const limit = pagination.limit ?? DEFAULT_PAGE_SIZE;
    const offset = pagination.offset ?? 0;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      throw new TransactionValidationError(`limit must be an integer between 1 and ${MAX_PAGE_SIZE}`);
    }
    if (!Number.isSafeInteger(offset) || offset < 0) {
      throw new TransactionValidationError('offset must be a non-negative safe integer');
    }

    try {
      return this.repository.getByUser(userId, limit, offset);
    } catch (error) {
      throw new TransactionServiceError('Unable to retrieve transactions', { cause: error });
    }
  }

  deleteAllForUser(userId: string, principal: AuthenticatedPrincipal): number {
    const principalUserId = validatePrincipal(principal);
    validateUserId(userId);
    if (principalUserId !== userId) {
      throw new TransactionAuthorizationError();
    }

    try {
      return this.repository.deleteAllForUser(userId);
    } catch (error) {
      throw new TransactionServiceError('Unable to delete transactions', { cause: error });
    }
  }
}