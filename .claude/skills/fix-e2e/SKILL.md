name: fix-e2e
description: Runs Cypress e2e tests (cypress/e2e/), diagnoses failures, and fixes the root cause. Use when the user wants to fix, debug, or run Cypress e2e tests locally. ONLY applies to the Cypress e2e test suite in frontend/src/main/webapp/cypress/e2e/. Does NOT apply to backend integration tests (*IT.kt), frontend unit tests (*.spec.ts), or any other test type.
---

When fixing E2E tests, always follow this workflow:

1. **Restart the backend** with `local,testdata` profile on port 8080. **This is mandatory before every Cypress run** — stale backend state causes cascading failures that look like frontend bugs. **Always ask the user to confirm the backend has been restarted** before invoking any Cypress command, even if it was already restarted moments ago.

2. **Run the full suite**:
```bash
cd frontend/src/main/webapp && npm run cy:run-ci-local
```
This waits for the Angular dev server on port 4200 and runs Cypress headless in Chrome.

3. **Diagnose failures**:
   - Identify failing specs from the test output
   - Read the corresponding `.cy.ts` files in `cypress/e2e/`
   - Check screenshots/videos in `cypress/screenshots/` and `cypress/videos/`
   - Determine the root cause: backend bug, missing testdata, frontend selector issue, or test flakiness

4. **Fix the root cause** — use the minimal fix approach:
   - **Backend bug**: Fix the API response, not the test
   - **Missing testdata**: Update the Flyway testdata SQL
   - **Frontend issue**: Fix the component, not the test
   - **Flaky test**: Replace `cy.wait()` with `cy.intercept()` or `cypress-recurse`

5. **Restart the backend** with `local,testdata` profile again. **Always ask the user to confirm** before proceeding. This is required to reset test data after any backend state changes during the previous run.

6. **Verify the fix** by re-running only the previously failing specs:
```bash
npx cypress run --browser chrome --spec "cypress/e2e/<file>.cy.ts" --config baseUrl=http://localhost:4200/
```

**Common gotchas:**
- `cy.wait(5000)` is a code smell — use `cy.intercept()` to wait for specific API responses instead
- **NEVER skip the backend restart confirmation** before a Cypress run. Stale data produces misleading failures and wastes iteration cycles.
- Never modify a Cypress test to "make it pass" — if the test catches a real bug, fix the bug
- Use `cy.intercept()` to assert on network requests, not just DOM state
- **Empty screenshots do NOT mean a test passed.** Screenshots may capture any lifecycle stage and are not authoritative — always check the actual Cypress test output for pass/fail status and error messages.
- **Do NOT assume a test is flaky just because it passes in isolation but behaves differently in the full suite.** This pattern often indicates state contamination (missing testdata, unclean state between specs, order-dependent behavior). Investigate the actual failure cause before labeling a test "flaky."
- **Never make assumptions from partial evidence.** When evidence is unclear, ask the user for clarification instead of guessing about what happened.
