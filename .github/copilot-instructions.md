# Copilot Instructions for FinTrack API
 
- Always implement strict input validation for all parameters (e.g., ensure amounts are positive numbers and IDs are non-empty).
- Always include try-catch blocks and custom error handling for database operations.
- Ensure all queries involving user data include proper authorization checks to prevent unauthorized access or broken object-level authorization (BOLA).
- Implement pagination for queries that return multiple records (like list or get-by-user endpoints).
- Use parameterized queries to protect against SQL injection vulnerabilities.