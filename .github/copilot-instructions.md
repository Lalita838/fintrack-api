# FinTrack API Copilot Instructions

## Technology and architecture
- Use TypeScript with strict compiler settings, Node.js 20+, native Fetch `Request`/`Response` at HTTP boundaries, and Better-SQLite3 for persistence.
- Keep the code layered: models define contracts; repositories own SQL; services own validation and business rules; controllers own HTTP parsing, auth context, and response mapping.
- Keep transaction code in `src/transactions/` and expense-splitting code in the corresponding models, services, and controllers. Avoid duplicating business logic between layers.
- Use ESM imports with `.js` extensions in TypeScript source to match the NodeNext build configuration.

## Correctness and validation
- Treat all request data as `unknown` until validated. Reject unexpected keys where practical and validate path, query, body, and principal inputs.
- Validate user IDs as non-empty bounded strings; validate amounts as finite positive values with no more than two decimal places and enforce documented upper bounds.
- Represent money calculations as integer cents internally. Define deterministic remainder handling for equal splits, and require custom shares to sum exactly to the total.
- Paginate every multi-record query with a bounded page size, a safe non-negative offset, stable ordering, and a total count.
- Return explicit, safe errors for invalid input, authorization failures, and database failures. Never silently substitute valid-looking defaults for malformed input.

## Security and persistence
- Derive the acting user from trusted authentication middleware; never accept a creator/owner identity from an untrusted request body.
- Authorize every user-scoped read, update, and delete against the authenticated principal before accessing records.
- Use parameterized SQL for every value. Keep database operations inside repository methods and wrap failures in service-level errors without exposing SQL details.
- Do not log tokens, credentials, request bodies containing personal financial data, or raw database errors to clients.
- Use transactions for operations that must persist as a unit, including a shared expense and all participant shares.
- The local token resolver is for development only. Production must use trusted authentication and HTTPS.

## Testing and delivery
- Add Node.js test-runner tests for business rules, boundaries, authorization/BOLA, pagination, persistence failures, and HTTP behavior.
- Use isolated in-memory SQLite databases in tests and always close them in `finally` blocks.
- Run `npm test` and `npm run build` after changes; add regression tests for each behavior fix.
- Keep docs aligned with actual implementation, distinguish local/demo authentication from production readiness, and never claim a tool action or review finding that was not verified.
- Keep source archives free of `node_modules`, generated output, local databases, and Git internals; verify archive contents and size before delivery.
