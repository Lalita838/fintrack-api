# PR: FinTrack transaction layers and expense splitting

## Summary

Adds a runnable TypeScript/Node.js API, modular transaction persistence and HTTP
handling, authenticated shared expense creation, equal/custom share calculation, and
paginated per-user balances. The implementation uses Better-SQLite3, parameterized
queries, integer-cent calculations, validation, and ownership checks.

## Changes

- Added transaction model, repository, service, and controller layers.
- Added `POST /api/users/{userId}/transactions`, `GET` for paginated user transactions,
  and `DELETE` for that user's transactions.
- Added `POST /api/expenses/shared` and `GET /api/users/{userId}/balances`.
- Added a local runnable HTTP adapter, architecture diagram, test documentation, and
  source-only zip command.
- Added unit and HTTP integration tests.

## Verification

- `npm run build` — passed.
- `npm test` — passed; 13 test cases expected after the HTTP transaction controller
  test is included.
- `npm run package:zip` — creates a source archive excluding installed/generated
  dependencies and local database data; verifies size below 300 MiB.

## AI Disclosure

GitHub Copilot Chat/Agent mode assisted with implementation and documentation. The
developer reviewed generated changes, checked compiler/test output, and corrected
issues documented in `PROMPTS.md`. The untouched transaction baseline described by
the assessment was not present, so the review is explicitly limited to verifiable
repository code and does not claim findings about unavailable generated output.

## Peer Review Simulation

These are constructive comments that a peer could leave on an initial feature draft;
they are not claims that the final code still has these defects.

1. **`src/services/balance-calculation.service.ts`, `calculateShares()` — currency
   rounding:** Please convert amounts to integer cents before splitting and define
   where remainder cents go. Floating-point division can produce balances that differ
   by a cent, which is material for financial records; the final implementation now
   distributes remainder cents deterministically.
2. **`src/controllers/expense-splitting.controller.ts`, `parseCreateInput()` —
   identity and ownership:** Please ensure the creator comes only from the verified
   principal, never from request JSON, and reject duplicate participants. Otherwise a
   caller could spoof ownership or create ambiguous ledger rows; the service now
   enforces principal-derived creator identity and unique participant IDs.
3. **`src/server.ts`, principal resolver — production authentication:** Please do not
   treat a configured demo token/user as multi-user authentication. Replace it with
   trusted identity middleware before deployment and test that changing a URL user ID
   cannot bypass authorization; the documented server is intentionally local/demo
   only.
