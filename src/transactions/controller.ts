import {
  TransactionAuthorizationError,
  TransactionService,
  TransactionServiceError,
  TransactionValidationError,
  type AuthenticatedPrincipal,
} from './service.js';
import type { CreateTransactionInput } from './model.js';

function isTransactionInput(value: unknown): value is CreateTransactionInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) =>
    !['amount', 'type', 'category', 'description', 'occurredAt'].includes(key)
  )) return false;
  return typeof candidate.amount === 'number' &&
    (candidate.type === 'income' || candidate.type === 'expense') &&
    typeof candidate.category === 'string' &&
    (candidate.description === undefined || typeof candidate.description === 'string') &&
    (candidate.occurredAt === undefined || typeof candidate.occurredAt === 'string');
}

export type TransactionPrincipalResolver = (
  request: Request,
) => AuthenticatedPrincipal | null | Promise<AuthenticatedPrincipal | null>;

const ROUTE = /^\/api\/users\/([^/]+)\/transactions$/;

export class TransactionController {
  constructor(
    private readonly service: TransactionService,
    private readonly resolvePrincipal: TransactionPrincipalResolver,
  ) {}

  canHandle(request: Request): boolean {
    return ROUTE.test(new URL(request.url).pathname);
  }

  async handle(request: Request): Promise<Response> {
    let principal: AuthenticatedPrincipal | null;
    try {
      principal = await this.resolvePrincipal(request);
    } catch {
      return this.json(500, { error: 'Unable to authenticate request' });
    }

    if (!principal) return this.json(401, { error: 'Authentication is required' });
    const match = ROUTE.exec(new URL(request.url).pathname);
    if (!match) return this.json(404, { error: 'Route not found' });

    let userId: string;
    try {
      userId = decodeURIComponent(match[1]);
    } catch {
      return this.json(400, { error: 'userId path parameter is not valid URL encoding' });
    }

    try {
      if (request.method === 'POST') {
        if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
          return this.json(415, { error: 'Content-Type must be application/json' });
        }
        let input: unknown;
        try {
          input = await request.json();
        } catch {
          return this.json(400, { error: 'Request body must contain valid JSON' });
        }
        if (!isTransactionInput(input)) {
          return this.json(400, { error: 'Request body is not a valid transaction input' });
        }
        return this.json(201, this.service.create(input, principal));
      }
      if (request.method === 'GET') {
        const url = new URL(request.url);
        const limit = this.parsePageParameter(url.searchParams.get('limit'));
        const offset = this.parsePageParameter(url.searchParams.get('offset'));
        return this.json(200, this.service.getByUser(
          userId,
          principal,
          {
            ...(limit === undefined ? {} : { limit }),
            ...(offset === undefined ? {} : { offset }),
          },
        ));
      }
      if (request.method === 'DELETE') {
        return this.json(200, { deleted: this.service.deleteAllForUser(userId, principal) });
      }
      return this.json(405, { error: 'Method not allowed' });
    } catch (error) {
      if (error instanceof TransactionAuthorizationError) {
        return this.json(403, { error: error.message });
      }
      if (error instanceof TransactionValidationError) {
        return this.json(400, { error: error.message });
      }
      if (error instanceof TransactionServiceError) {
        return this.json(500, { error: error.message });
      }
      return this.json(500, { error: 'Unable to process transaction request' });
    }
  }

  private parsePageParameter(value: string | null): number | undefined {
    if (value === null) return undefined;
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
      throw new TransactionValidationError('pagination values must be safe non-negative integers');
    }
    return Number(value);
  }

  private json(status: number, body: unknown): Response {
    return Response.json(body, {
      status,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
