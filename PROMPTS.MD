# GitHub Copilot Prompt Log - FinTrack API
 
## Section 2: AI Generation
- **Prompt**: "Generate a Transaction model and a Transaction service with create, get-by-user, and delete-all functions. Use a database."
 
## Section 3: Code Review & Security
- **Prompt**: "/explain are there any security vulnerabilities in transaction.service.ts?"
 
## Section 4: Remediation
- **Prompt**: "Refactor transaction.service.ts to add strong input validation, proper try-catch error handling, pagination to get-by-user, and secure authorization checks following our repo instructions."
 
## Section 5: Expense Splitting Feature
- **Prompt 5.1**: "Create a TypeScript interface for a SharedExpense model. It should include fields for id, creatorId, description, totalAmount, splitType ('equal' | 'custom'), createdAt, and a participants array where each participant has userId and shareAmount."

- **Prompt 5.2**: "#file:src/models/shared-expense.ts Create a BalanceCalculationService class with methods to: 1. Calculate and validate individual shares for both 'equal' and 'custom' split types (ensuring custom amounts sum up to totalAmount and handling edge cases like single participants). 2. Compute net balances between users given a list of shared expenses. Include strict input validation and descriptive error handling."

- **Prompt 5.3**: "#file:src/services/balance-calculation.service.ts Create an ExpenseSplittingController or route handlers with endpoints to: 1. POST /api/expenses/shared - To create a new shared expense with participants and run the validation service. 2. GET /api/users/{userId}/balances - To fetch all pending net balances for a specific user. Ensure proper authentication/authorization checks."

- **Prompt 5.4**: "#file:src/services/balance-calculation.service.ts Write a comprehensive unit test suite using Jest or Node test runner covering these 6 cases: 1. Equal split among 3 participants. 2. Valid custom split matching the total amount. 3. Invalid custom split where amounts do not sum to total (should fail validation). 4. Net balance calculation between users with multiple shared expenses. 5. Edge case with only 1 participant (should handle gracefully/fail). 6. Unauthorized access attempt (BOLA check)."