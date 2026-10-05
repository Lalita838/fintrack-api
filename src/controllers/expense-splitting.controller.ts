import type Database from 'better-sqlite3';
import type { SharedExpense } from '../models/shared-expense.js';
import {
  BalanceCalculationService,
  BalanceCalculationValidationError,
} from '../services/balance-calculation.service.js';

export interface AuthenticatedPrincipal {
  userId: string;
}

export type PrincipalResolver = (
  request: Request,
) => AuthenticatedPrincipal | null | Promise<AuthenticatedPrincipal | null>;

export class ExpenseSplittingAuthorizationError extends Error {
  constructor(message = 'Not authorized to access these shared expenses') {
    super(message);
    this.name = 'ExpenseSplittingAuthorizationError';
  }
}

export class ExpenseSplittingServiceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ExpenseSplittingServiceError';
  }
}

interface BalanceRow {
  user_id: string;
  amount: number;
}

const MAX_USER_ID_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 1_000;
const MAX_PARTICIPANTS = 1_000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function rejectUnexpectedKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  field: string,
): void {
  const unexpectedKey = Object.keys(value).find((key) => !allowedKeys.includes(key));
  if (unexpectedKey) {
    throw new BalanceCalculationValidationError(`${field} contains unsupported field "${unexpectedKey}"`);
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

function validatePrincipal(principal: AuthenticatedPrincipal | null): string {
  if (
    !principal ||
    typeof principal.userId !== 'string' ||
    !principal.userId.trim() ||
    principal.userId.length > MAX_USER_ID_LENGTH
  ) {
    throw new ExpenseSplittingAuthorizationError('Authentication is required');
  }
  return principal.userId;
}

function parsePageParameter(value: string | null, fallback: number, name: string): number {
  if (value === null) {
    return fallback;
  }
  if (!/^\d+$/.test(value)) {
    throw new BalanceCalculationValidationError(`${name} must be a non-negative integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new BalanceCalculationValidationError(`${name} must be a safe integer`);
  }
  return parsed;
}

function parseCreateInput(
  input: unknown,
  principalUserId: string,
  calculationService: BalanceCalculationService,
): Omit<SharedExpense, 'id'> {
  if (!isRecord(input)) {
    throw new BalanceCalculationValidationError('request body must be an object');
  }
  rejectUnexpectedKeys(input, ['description', 'totalAmount', 'splitType', 'participants'], 'request body');
  if (
    typeof input.description !== 'string' ||
    !input.description.trim() ||
    input.description.trim().length > MAX_DESCRIPTION_LENGTH
  ) {
    throw new BalanceCalculationValidationError(
      `description must be a non-empty string of at most ${MAX_DESCRIPTION_LENGTH} characters`,
    );
  }
  if (input.splitType !== 'equal' && input.splitType !== 'custom') {
    throw new BalanceCalculationValidationError('splitType must be equal or custom');
  }
  const totalAmount = input.totalAmount;
  if (typeof totalAmount !== 'number') {
    throw new BalanceCalculationValidationError('totalAmount must be a positive amount');
  }
  if (!Array.isArray(input.participants) || input.participants.length === 0) {
    throw new BalanceCalculationValidationError('participants must contain at least one participant');
  }
  if (input.participants.length > MAX_PARTICIPANTS) {
    throw new BalanceCalculationValidationError(`participants cannot exceed ${MAX_PARTICIPANTS} entries`);
  }

  const participants = input.participants.map((participant, index) => {
    const field = `participants[${index}]`;
    if (!isRecord(participant)) {
      throw new BalanceCalculationValidationError(`${field} must be an object`);
    }
    rejectUnexpectedKeys(participant, ['userId', 'shareAmount'], field);
    validateUserId(participant.userId, `${field}.userId`);

    const shareAmount = participant.shareAmount;
    if (input.splitType === 'custom' && !Object.hasOwn(participant, 'shareAmount')) {
      throw new BalanceCalculationValidationError(`${field}.shareAmount is required for custom splits`);
    }
    if (shareAmount !== undefined && typeof shareAmount !== 'number') {
      throw new BalanceCalculationValidationError(`${field}.shareAmount must be a non-negative number`);
    }

    return {
      userId: participant.userId,
      shareAmount: shareAmount ?? 0,
    };
  });

  const expense: SharedExpense = {
    id: 1,
    creatorId: principalUserId,
    description: input.description.trim(),
    totalAmount,
    splitType: input.splitType,
    createdAt: new Date().toISOString(),
    participants,
  };
  const validatedShares = calculationService.calculateShares(expense);

  return {
    creatorId: expense.creatorId,
    description: expense.description,
    totalAmount: expense.totalAmount,
    splitType: expense.splitType,
    createdAt: expense.createdAt,
    participants: validatedShares,
  };
}

export class ExpenseSplittingController {
  constructor(
    private readonly database: Database.Database,
    private readonly resolvePrincipal: PrincipalResolver,
    private readonly calculationService = new BalanceCalculationService(),
  ) {}

  async handle(request: Request): Promise<Response> {
    let principal: AuthenticatedPrincipal | null;
    try {
      principal = await this.resolvePrincipal(request);
    } catch (error) {
      return this.json(500, { error: 'Unable to authenticate request' });
    }

    try {
      const principalUserId = validatePrincipal(principal);
      const url = new URL(request.url);

      if (request.method === 'POST' && url.pathname === '/api/expenses/shared') {
        return await this.createSharedExpense(request, principalUserId);
      }

      const balanceRoute = /^\/api\/users\/([^/]+)\/balances$/.exec(url.pathname);
      if (request.method === 'GET' && balanceRoute) {
        let userId: string;
        try {
          userId = decodeURIComponent(balanceRoute[1]);
        } catch {
          throw new BalanceCalculationValidationError('userId path parameter is not valid URL encoding');
        }
        return this.getUserBalances(url, userId, principalUserId);
      }

      return this.json(404, { error: 'Route not found' });
    } catch (error) {
      if (error instanceof ExpenseSplittingAuthorizationError) {
        return this.json(error.message === 'Authentication is required' ? 401 : 403, {
          error: error.message,
        });
      }
      if (error instanceof BalanceCalculationValidationError) {
        return this.json(400, { error: error.message });
      }
      if (error instanceof ExpenseSplittingServiceError) {
        return this.json(500, { error: error.message });
      }
      return this.json(500, { error: 'Unable to process shared expense request' });
    }
  }

  private async createSharedExpense(
    request: Request,
    principalUserId: string,
  ): Promise<Response> {
    if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
      return this.json(415, { error: 'Content-Type must be application/json' });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return this.json(400, { error: 'Request body must contain valid JSON' });
    }

    const expense = parseCreateInput(body, principalUserId, this.calculationService);
    try {
      const transaction = this.database.transaction(() => {
        const result = this.database.prepare(`
          INSERT INTO shared_expenses
            (creator_id, description, total_amount, split_type, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          expense.creatorId,
          expense.description,
          expense.totalAmount,
          expense.splitType,
          expense.createdAt,
        );
        const id = Number(result.lastInsertRowid);

        const insertParticipant = this.database.prepare(`
          INSERT INTO shared_expense_participants (expense_id, user_id, share_amount)
          VALUES (?, ?, ?)
        `);
        for (const participant of expense.participants) {
          insertParticipant.run(id, participant.userId, participant.shareAmount);
        }

        return { ...expense, id };
      });

      return this.json(201, transaction());
    } catch (error) {
      throw new ExpenseSplittingServiceError('Unable to create shared expense', { cause: error });
    }
  }

  private getUserBalances(
    url: URL,
    userId: string,
    principalUserId: string,
  ): Response {
    validateUserId(userId, 'userId');
    if (userId !== principalUserId) {
      throw new ExpenseSplittingAuthorizationError();
    }

    const limit = parsePageParameter(url.searchParams.get('limit'), DEFAULT_PAGE_SIZE, 'limit');
    const offset = parsePageParameter(url.searchParams.get('offset'), 0, 'offset');
    if (limit < 1 || limit > MAX_PAGE_SIZE) {
      throw new BalanceCalculationValidationError(`limit must be between 1 and ${MAX_PAGE_SIZE}`);
    }

    const balancesQuery = `
      SELECT counterparty_user_id, SUM(amount_cents) AS amount_cents
      FROM (
        SELECT participant.user_id AS counterparty_user_id,
               CAST(ROUND(participant.share_amount * 100) AS INTEGER) AS amount_cents
        FROM shared_expenses AS expense
        JOIN shared_expense_participants AS participant ON participant.expense_id = expense.id
        WHERE expense.creator_id = ? AND participant.user_id <> ?

        UNION ALL

        SELECT expense.creator_id AS counterparty_user_id,
               -CAST(ROUND(participant.share_amount * 100) AS INTEGER) AS amount_cents
        FROM shared_expenses AS expense
        JOIN shared_expense_participants AS participant ON participant.expense_id = expense.id
        WHERE participant.user_id = ? AND expense.creator_id <> ?
      )
      GROUP BY counterparty_user_id
      HAVING SUM(amount_cents) <> 0
    `;

    try {
      const total = (this.database.prepare(`
        SELECT COUNT(*) AS total FROM (${balancesQuery})
      `).get(userId, userId, userId, userId) as { total: number }).total;
      const rows = this.database.prepare(`
        SELECT counterparty_user_id AS user_id, SUM(amount_cents) / 100.0 AS amount
        FROM (${balancesQuery})
        GROUP BY counterparty_user_id
        HAVING SUM(amount_cents) <> 0
        ORDER BY counterparty_user_id
        LIMIT ? OFFSET ?
      `).all(userId, userId, userId, userId, limit, offset) as BalanceRow[];

      return this.json(200, {
        items: rows.map(({ user_id, amount }) => ({ userId: user_id, amount })),
        total,
        limit,
        offset,
      });
    } catch (error) {
      throw new ExpenseSplittingServiceError('Unable to retrieve user balances', { cause: error });
    }
  }

  private json(status: number, body: unknown): Response {
    return Response.json(body, {
      status,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
