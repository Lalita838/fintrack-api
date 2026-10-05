# fintrack-api
FinTrack API case study for GitHub Copilot SBA

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
