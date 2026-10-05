# GitHub Copilot Tool Strategy

## Feature Usage Log

| # | Feature | What and why | Outcome |
|---|---|---|---|
| 1 | Copilot Chat | Used focused prompts to establish the model, splitting rules, endpoints, and tests in stages instead of requesting the entire application at once. | Kept the work decomposed into contracts, rules, HTTP handling, and verification. |
| 2 | Repository custom instructions | Added `.github/copilot-instructions.md` so suggestions consistently account for money validation, BOLA, SQL parameterization, pagination, and tests. | Established persistent project-specific constraints for future Copilot sessions. |
| 3 | `#file` context in Copilot Chat | Referenced the shared-expense model and balance service when requesting dependent implementation and tests. | Reduced ambiguity about interfaces and promoted consistency across layers. |
| 4 | Copilot Agent mode | Used workspace-aware, multi-file changes to add the server, transaction layers, documentation, and source packaging workflow. | Connected related code and submission artifacts in one implementation pass. |
| 5 | Agent terminal/build integration | Ran the existing `npm run build` and `npm test` scripts and used their actual output to guide fixes. | Detected and corrected a TypeScript export error; final build and all 13 tests pass. |
| 6 | Iterative Chat refinement | Supplied the full assessment requirements after identifying missing deliverables, then revisited archive contents and docs. | Exposed omissions such as required docs missing from the zip and added explicit verification. |

## Scenario Responses

1. **Understanding a complex 500-line function:** Use Copilot Chat with the function selected and ask for a structured explanation of inputs, branches, side effects, and dependencies before requesting changes. Selected context keeps the answer grounded in the actual code, and the explanation can be checked against the function before editing.
2. **Adding consistent error handling across eight route handlers:** Use Copilot Agent mode with all relevant route files in workspace context and give it the repository's error-mapping conventions as constraints. Agent mode is suited to coordinated repeated edits; review the diff and run route tests to ensure it did not normalize distinct errors incorrectly.
3. **Quickly verifying an international phone regex:** Use Copilot Chat to propose representative valid and invalid examples, then run those cases in a tiny test or REPL. Chat is faster than broad agent edits, but regex behavior must be verified by execution against country-code, punctuation, and boundary examples.
4. **Enforcing checks on every pull request without human intervention:** Use GitHub Actions CI workflows with required status checks and branch protection, not Copilot autocomplete. CI can run lint, tests, and builds on each PR; repository administrators must require those checks before merging.
5. **Reviewing a teammate's AI-generated authentication module for vulnerabilities:** Use Copilot code review or Copilot Chat in a security-focused review, with the full auth flow and its callers in context. Ask it to trace trust boundaries and authorization decisions, then verify findings with targeted tests and an independent security review rather than accepting suggestions as proof.
6. **Ensuring Copilot follows project conventions across developers and sessions:** Add and maintain `.github/copilot-instructions.md` with explicit stack, architecture, security, and test rules. Repository-level instructions persist across sessions and are shared with developers using the repository, unlike a one-off chat prompt.

## Limitations Encountered

1. **Assessment documents were omitted from the first source archive.** The initial
   packaging script listed only the app and a subset of documents. Inspecting the zip
   exposed the mismatch; the script now includes all required documents and verifies
   archive contents and size. In future, derive the archive allowlist from the
   submission checklist and inspect it before delivery.
2. **The original transaction-generation baseline was unavailable.** The prompt log
   records the required low-effort prompt, but no untouched generated files were
   present, so a historical “Copilot introduced” review cannot be proven. I reviewed
   only verifiable transaction code, added the missing repository/controller layers,
   and disclosed this evidence limitation instead of inventing baseline findings.
   Preserve generated output and a commit before remediation in future assessments.
3. **The first transaction module type export did not compile.** The initial
   interface attempted to extend an inline `import()` type, which TypeScript rejects.
   The compiler identified the exact file; replacing it with a type alias resolved
   the issue. In future, compile new public type boundaries immediately before
   integrating dependent layers.
