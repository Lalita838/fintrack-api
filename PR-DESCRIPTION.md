# Pull Request: Expense Splitting Feature & Security Remediation
 
## Description
This pull request delivers the required **Expense Splitting** feature for the FinTrack API assessment, allowing users to track shared expenses via equal or custom splits. It also includes comprehensive security remediation for transaction services to mitigate Broken Object Level Authorization (BOLA) and injection vulnerabilities.
 
## Changes Included
- **Model Layer**: Added the `SharedExpense` TypeScript interface with participant tracking and split type validations.

- **Service Layer**: Implemented `BalanceCalculationService` to compute net balances, validate custom split distributions against total amounts, and handle single-participant edge cases.

- **API & Controllers**: Established endpoints for creating shared expenses and querying pending user balances.

- **Testing**: Added a robust unit test suite covering 6 core validation and balance calculation test scenarios with passing results.

- **Security Remediation**: Refactored 
transaction services with rigorous input checks and BOLA authorization guards.