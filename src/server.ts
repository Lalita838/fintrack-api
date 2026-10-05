import { timingSafeEqual } from 'node:crypto';
import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { Database as DatabaseType } from 'better-sqlite3';
import { ExpenseSplittingController, type PrincipalResolver } from './controllers/expense-splitting.controller.js';
import { TransactionController } from './transactions/controller.js';
import { TransactionService } from './transactions/service.js';
import { createDatabase } from './database.js';

const MAX_REQUEST_BODY_BYTES = 1024 * 1024;

function writeJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = Buffer.from(JSON.stringify(body));
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': payload.byteLength,
    'Cache-Control': 'no-store',
  });
  response.end(payload);
}

async function toFetchRequest(request: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  let size = 0;
  let tooLarge = false;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > MAX_REQUEST_BODY_BYTES) {
      tooLarge = true;
    } else if (!tooLarge) {
      chunks.push(buffer);
    }
  }

  if (tooLarge) {
    throw new RequestBodyTooLargeError();
  }

  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  const url = new URL(request.url ?? '/', 'http://localhost');
  const method = request.method ?? 'GET';
  const body = method === 'GET' || method === 'HEAD'
    ? undefined
    : Buffer.concat(chunks).toString('utf8');
  return new Request(url, { method, headers, body });
}

class RequestBodyTooLargeError extends Error {
  constructor() {
    super('Request body exceeds the 1 MiB limit');
    this.name = 'RequestBodyTooLargeError';
  }
}

export function createApiServer(
  database: DatabaseType,
  resolvePrincipal: PrincipalResolver,
): Server {
  const controller = new ExpenseSplittingController(database, resolvePrincipal);
  const transactionController = new TransactionController(
    new TransactionService(database),
    resolvePrincipal,
  );
  return createHttpServer(async (incoming, outgoing) => {
    try {
      const request = await toFetchRequest(incoming);
      const response = transactionController.canHandle(request)
        ? await transactionController.handle(request)
        : await controller.handle(request);
      const payload = Buffer.from(await response.arrayBuffer());
      outgoing.writeHead(response.status, {
        ...Object.fromEntries(response.headers.entries()),
        'Content-Length': payload.byteLength,
      });
      outgoing.end(payload);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        writeJson(outgoing, 413, { error: error.message });
        return;
      }
      console.error('Unable to handle HTTP request', error);
      if (!outgoing.headersSent) {
        writeJson(outgoing, 500, { error: 'Unable to process request' });
      } else {
        outgoing.destroy(error instanceof Error ? error : undefined);
      }
    }
  });
}

function createConfiguredPrincipalResolver(
  token: string,
  userId: string,
): PrincipalResolver {
  const expected = Buffer.from(token);
  return (request) => {
    const authorization = request.headers.get('authorization') ?? '';
    const match = /^Bearer ([^\s]+)$/.exec(authorization);
    if (!match) return null;

    const supplied = Buffer.from(match[1]);
    if (
      supplied.byteLength !== expected.byteLength ||
      !timingSafeEqual(supplied, expected)
    ) {
      return null;
    }
    return { userId };
  };
}

export function startServer(): { server: Server; database: DatabaseType } {
  const token = process.env.FINTRACK_API_TOKEN;
  if (!token || token.length < 16) {
    throw new Error('FINTRACK_API_TOKEN must be set to at least 16 characters');
  }

  const userId = process.env.FINTRACK_USER_ID ?? 'demo-user';
  if (!userId.trim() || userId.length > 255) {
    throw new Error('FINTRACK_USER_ID must be a non-empty string of at most 255 characters');
  }

  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const host = process.env.HOST ?? '127.0.0.1';
  const database = createDatabase();
  const server = createApiServer(
    database,
    createConfiguredPrincipalResolver(token, userId),
  );

  server.on('error', (error) => {
    console.error('Unable to start FinTrack API server', error);
    database.close();
    process.exitCode = 1;
  });
  server.listen(port, host, () => {
    console.log(`FinTrack API listening on http://${host}:${port} (user: ${userId})`);
  });
  const shutdown = (): void => {
    server.close((error) => {
      database.close();
      if (error) {
        console.error('Unable to close FinTrack API server', error);
        process.exitCode = 1;
      }
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  return { server, database };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    startServer();
  } catch (error) {
    console.error('Unable to start FinTrack API server', error);
    process.exitCode = 1;
  }
}
