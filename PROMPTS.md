# GitHub Copilot Prompt Log — FinTrack API

This log records the prompts retained in the project prompt log and the follow-up
assessment request used during this implementation. The original untouched Copilot
generation output was not present in the repository when this work began; therefore,
the transaction review is limited to code verifiably present in this repository.

## Prompt chain

| Order | Exact prompt text | Copilot feature | Technique | Rationale |
|---|---|---|---|---|
| 1 | “Generate a Transaction model and a Transaction service with create, get-by-user, and delete-all functions. Use a database.” | Copilot Chat | Low-constraint baseline | This is the exact required low-effort prompt retained in the existing prompt log. Its untouched generated output was not available to compare or reproduce. |
| 2 | “/explain are there any security vulnerabilities in transaction.service.ts?” | Copilot Chat with workspace context | Role/task specificity | Focuses review on security in the transaction service; every suggestion still needs code verification. |
| 3 | “Refactor transaction.service.ts to add strong input validation, proper try-catch error handling, pagination to get-by-user, and secure authorization checks following our repo instructions.” | Copilot Chat / Agent mode | Constraint-based refinement | Specifies concrete remediation standards and uses the repository instructions as constraints. |
| 4 | “Create a TypeScript interface for a SharedExpense model. It should include fields for id, creatorId, description, totalAmount, splitType ('equal' \| 'custom'), createdAt, and a participants array where each participant has userId and shareAmount.” | Copilot Chat | Specificity | Defines the data shape before asking for business behavior. |
| 5 | “#file:src/models/shared-expense.ts Create a BalanceCalculationService class with methods to: 1. Calculate and validate individual shares for both 'equal' and 'custom' split types (ensuring custom amounts sum up to totalAmount and handling edge cases like single participants). 2. Compute net balances between users given a list of shared expenses. Include strict input validation and descriptive error handling.” | Copilot Chat with `#file` context | Decomposition and constraints | Scopes service behavior against the model and separates share calculation from netting. |
| 6 | “#file:src/services/balance-calculation.service.ts Create an ExpenseSplittingController or route handlers with endpoints to: 1. POST /api/expenses/shared - To create a new shared expense with participants and run the validation service. 2. GET /api/users/{userId}/balances - To fetch all pending net balances for a specific user. Ensure proper authentication/authorization checks.” | Copilot Chat with `#file` context | Contextual prompting | Adds HTTP behavior after the model/service contracts are established and calls out authorization. |
| 7 | “#file:src/services/balance-calculation.service.ts Write a comprehensive unit test suite using Jest or Node test runner covering these 6 cases: 1. Equal split among 3 participants. 2. Valid custom split matching the total amount. 3. Invalid custom split where amounts do not sum to total (should fail validation). 4. Net balance calculation between users with multiple shared expenses. 5. Edge case with only 1 participant (should handle gracefully/fail). 6. Unauthorized access attempt (BOLA check).” | Copilot Chat with `#file` context | Few-shot/test-driven decomposition | Enumerates expected scenarios before implementation is accepted. |
| 8 | “give according to conent i shared, it should follow all required guidelines and things” | Copilot Chat in Agent mode | Iterative refinement and constraints | Used to compare the repository with every requested artifact, close packaging/documentation gaps, and add a runnable API and transaction layers. |

## Post-Generation Corrections

- Added cents-based arithmetic after checking financial split behavior; floating-point
  shares can otherwise lose or create cents. Equal-split remainder is distributed
  deterministically and custom shares must total the exact amount.
- Added authenticated-principal ownership checks; a request body or URL alone must not
  select the identity whose financial data is read or changed.
- Added a repository boundary and transaction HTTP controller because the existing
  transaction service performed SQL directly and had no dedicated HTTP adapter.
- Added a real Node HTTP server and local bearer-token resolver; documented that this
  single-identity local resolver is not production authentication.
- Added an HTTP integration test and documented the unit test cases, in addition to the
  calculation and service tests.
- Fixed a TypeScript build error found while creating the transaction module type
  exports, then reran the build and test suite.
- Updated the source-zip script to include assessment documents while excluding
  `node_modules`, generated output, local database files, and Git metadata.
