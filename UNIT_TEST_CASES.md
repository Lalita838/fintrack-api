# Unit Test Case Documentation

Run the full suite with `npm test`. Tests use in-memory SQLite databases, so they do
not require or modify the local application database.

| Test file | Test case | Expected behavior |
|---|---|---|
| `tests/balance-calculation.service.test.ts` | Calculates equal shares in cents and handles one participant | Splits amounts without losing cents and handles a one-person split. |
| `tests/balance-calculation.service.test.ts` | Validates custom shares and computes net balances across expenses | Accepts valid custom allocations and nets amounts owed across multiple expenses. |
| `tests/balance-calculation.service.test.ts` | Rejects malformed expenses and custom shares that do not add up | Rejects invalid expense data and allocations whose sum differs from the total. |
| `tests/expense-splitting.controller.test.ts` | Creates shared expenses and returns authenticated users their net balances | Persists an equal split and returns the correct signed balances for each participant. |
| `tests/expense-splitting.controller.test.ts` | Validates shared expenses and blocks unauthenticated and cross-user requests | Returns validation/authentication/authorization errors for invalid requests. |
| `tests/expense-splitting.controller.test.ts` | Paginates balance counterparties | Applies balance `limit` and `offset` while returning the overall count. |
| `tests/expense-splitting.controller.test.ts` | Rejects BOLA attempts to read another user's balances | Prevents a principal from reading another user's balances. |
| `tests/transaction.service.test.ts` | Creates, retrieves, and deletes only the selected user transactions | Scopes transaction operations to the authenticated user. |
| `tests/transaction.service.test.ts` | Paginates transactions and reports the total for the user | Returns the requested page and total matching transaction count. |
| `tests/transaction.service.test.ts` | Rejects invalid input and cross-user access | Rejects invalid transaction values and unauthorized cross-user operations. |
| `tests/transaction.service.test.ts` | Wraps database errors without exposing them as service messages | Returns a safe service error when a database operation fails. |
| `tests/server.test.ts` | Serves authenticated HTTP requests and rejects missing credentials | Starts the HTTP adapter, denies unauthenticated requests, and serves a successful authenticated expense request. |
| `tests/transaction.controller.test.ts` | Creates, paginates, deletes, and authorizes transaction HTTP requests | Exercises the transaction HTTP controller, verifies pagination and same-user operations, and rejects cross-user access. |
