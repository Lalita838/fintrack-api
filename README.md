# fintrack-api
FinTrack API case study for GitHub Copilot SBA

## Run the API

Requires Node.js 20 or later and npm. Install the declared dependencies, then start
the development server with a local API token:

```sh
npm install
FINTRACK_API_TOKEN=local-development-token npm run dev
```

The API listens on `http://localhost:3000` by default. Its local demo identity is
`demo-user`; set `FINTRACK_USER_ID` to change it. Set `PORT`, `HOST`, or
`DATABASE_PATH` to change the listener or SQLite database location. The configured
identity is established by the server, not by a caller-supplied user ID. The
development token is for local use only; deploy behind trusted authentication and
HTTPS for real users.

Build and start the compiled application with:

```sh
npm run build
FINTRACK_API_TOKEN=local-development-token npm start
```

### Example requests

Use the configured token for the `demo-user` identity:

```sh
curl -X POST http://localhost:3000/api/expenses/shared \
  -H 'Authorization: Bearer local-development-token' \
  -H 'Content-Type: application/json' \
  -d '{"description":"Dinner","totalAmount":30,"splitType":"equal","participants":[{"userId":"demo-user"},{"userId":"friend"}]}'

curl 'http://localhost:3000/api/users/demo-user/balances' \
  -H 'Authorization: Bearer local-development-token'
```

## Shared expenses

`ExpenseSplittingController.handle(request)` exposes native Request/Response handlers
for `POST /api/expenses/shared` and `GET /api/users/{userId}/balances`. Construct the
controller with the database and a principal resolver backed by trusted authentication
middleware; the resolver must return the authenticated user's ID or `null`.

The create endpoint accepts JSON with `description`, `totalAmount`, `splitType`, and
`participants` (`userId` and, for custom splits, `shareAmount`). The creator ID is
always taken from the authenticated principal. Equal split shares are calculated and
stored by the service. Balance results are paginated with optional `limit` and `offset`
query parameters; positive amounts are owed to the requested user, and negative
amounts are owed by them. Until settlement tracking is introduced, all recorded shared
expenses are treated as pending.

## Transactions

The transaction module is organized under `src/transactions/` into model,
repository, service, and controller layers. Authenticated transaction routes are
`POST /api/users/{userId}/transactions`, `GET /api/users/{userId}/transactions`
(supports `limit` and `offset`), and `DELETE /api/users/{userId}/transactions`.
The local server's single configured identity may operate only on that user's
transactions.

## Tests and source archive

Run the automated tests with `npm test`; build/type-check with `npm run build`.
The test scenarios are documented in [UNIT_TEST_CASES.md](./UNIT_TEST_CASES.md).

Create a submission-ready source zip using `npm run package:zip`. The archive contains
the source, tests, and documentation, but excludes `node_modules`, generated `dist`,
local database files, and Git metadata. It checks that the resulting archive is below
300 MiB. Dependencies remain listed in `package.json` and `package-lock.json` and are
installed separately with `npm install`.
