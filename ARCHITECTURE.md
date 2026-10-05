# FinTrack API Architecture
 
## Overview
FinTrack API is a backend expense-tracking service built with **TypeScript**, **Node.js**, and **Better-SQLite3**, designed around modular service patterns and secure coding guardrails.
 
## Directory Structure & Components
- **`src/models/`**: Contains TypeScript interfaces defining core data contracts (`transaction.ts`, `shared-expense.ts`).
- **`src/services/`**: Encapsulates business logic, database queries, and validation rules (`transaction.service.ts`, `balance-calculation.service.ts`).
- **`src/database.ts`**: Initializes the SQLite database connection and sets up secure table schemas using parameterized queries to protect against SQL injection.
- **`tests/`**: Unit test suite validating calculation accuracy, split constraints, and authorization rules.
 