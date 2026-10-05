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

The assessment text received here did not include the scenario descriptions after
“Scenario Responses.” These are representative responses for common development
scenarios rather than claims about omitted prompt content.

| Scenario | Copilot feature | Why |
|---|---|---|
| Explore an unfamiliar codebase | Copilot Chat with `@workspace` context | Ask for relevant paths and call flows, then inspect cited source files. This is more useful than autocomplete when understanding relationships across files. |
| Implement a cross-file API feature | Copilot Agent mode with repository instructions | Agent mode can make coordinated changes and run the project checks. Keep the task bounded and inspect every changed file and command result. |
| Explain or review a focused function | Copilot Chat with `#file` or selected-code context | Supplying exact context limits speculation and supports actionable feedback. Verify every claimed issue against the actual code. |
| Generate a regression test | Copilot Chat or inline test generation with the implementation file selected | The feature can derive cases from the behavior under test; explicitly request boundaries, authorization, and failure paths. Run tests and inspect assertions for false positives. |

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
