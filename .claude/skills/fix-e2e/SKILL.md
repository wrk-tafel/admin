name: fix-e2e
description: Runs Cypress e2e tests (cypress/e2e/), diagnoses failures, and fixes the root cause. Use when the user wants to fix, debug, or run Cypress e2e tests locally. ONLY applies to the Cypress e2e test suite in frontend/src/main/webapp/cypress/e2e/. Does NOT apply to backend integration tests (*IT.kt), frontend unit tests (*.spec.ts), or any other test type.
---

This workflow is fully automated — never ask the user to restart anything, confirm state, or run a command themselves. You start and restart every process yourself using your own tools.

When fixing E2E tests, always follow this workflow:

1. **Restart the backend yourself**, with the **`e2e`** profile (not `local`/`local,testdata`) on port 8080 — `application-e2e.yml` is the profile that exists specifically for Cypress runs (test JWT config, testdata migrations, and paths like `tafeladmin.storage.scannerPath` that e2e fixtures rely on all live there). Using `local`/`local,testdata` instead is a real source of failures that look like frontend/backend bugs but are actually just profile mismatches — don't substitute it in, even for a "quick" run. **Restarting is mandatory before every Cypress run** — stale backend state causes cascading failures that look like frontend bugs. Do this unconditionally and without asking for confirmation, every single time, even if you believe it was already restarted moments ago:
   - Kill whatever is currently listening on port 8080. Match on the **local address column specifically** (`$2 ~ /:8080$/`), not a `LISTENING` text grep — netstat's status column is localized (e.g. German Windows prints `ABHÖREN`, not `LISTENING`), so a text-based match silently finds nothing and looks like "nothing to kill" even when something is. A plain substring grep for `:8080` is just as unsafe in the other direction — it also matches unrelated rows where `8080` merely appears in a foreign-address field of some other process's connection (e.g. the frontend dev server's proxy connection *to* the backend), so it can kill the wrong process:
     ```bash
     PID=$(netstat -ano | awk '$2 ~ /:8080$/ {print $NF; exit}')
     if [ -n "$PID" ]; then taskkill //PID "$PID" //F; fi
     ```
   - Start it fresh in the background (use the Bash tool with `run_in_background: true`):
     ```bash
     cd /c/development/repos/admin && ./gradlew :backend:bootRun --args='--spring.profiles.active=e2e'
     ```
   - Poll until the port is actually open before moving on — never proceed on a fixed sleep:
     ```bash
     for i in $(seq 1 90); do
       PID=$(netstat -ano | awk '$2 ~ /:8080$/ {print $NF; exit}')
       [ -n "$PID" ] && break
       sleep 2
     done
     ```

2. **Make sure the Angular dev server is up** on port 4200 — start it if it isn't, leave it alone if it already is (it doesn't need restarting, only the backend does). Same locale-safe column match as above:
   ```bash
   netstat -ano | awk '$2 ~ /:4200$/ {found=1} END {exit !found}'
   ```
   If that finds nothing, start it in the background (`run_in_background: true`) and poll port 4200 the same way as step 1:
   ```bash
   cd frontend/src/main/webapp && npm run dev
   ```

3. **Run the full suite**:
```bash
cd frontend/src/main/webapp && npm run cy:run-ci-local
```
This waits for the Angular dev server on port 4200 and runs Cypress headless in Chrome.

4. **Diagnose failures**:
   - Identify failing specs from the test output
   - Read the corresponding `.cy.ts` files in `cypress/e2e/`
   - Check screenshots/videos in `cypress/screenshots/` and `cypress/videos/`
   - Determine the root cause: backend bug, missing testdata, frontend selector issue, or test flakiness

5. **Fix the root cause** — use the minimal fix approach:
   - **Backend bug**: Fix the API response, not the test
   - **Missing testdata**: Update the Flyway testdata SQL
   - **Frontend issue**: Fix the component, not the test
   - **Flaky test**: Replace `cy.wait()` with `cy.intercept()` or `cypress-recurse`

6. **Restart the backend yourself again**, exactly as in step 1 (kill whatever holds port 8080, relaunch with the `e2e` profile, poll until the port is open). No confirmation, no exceptions — this resets test data after any backend state changes during the previous run.

7. **Verify the fix** by re-running only the previously failing specs:
```bash
npx cypress run --browser chrome --spec "cypress/e2e/<file>.cy.ts" --config baseUrl=http://localhost:4200/
```

**Common gotchas:**
- `cy.wait(5000)` is a code smell — use `cy.intercept()` to wait for specific API responses instead
- **NEVER skip the backend restart** before a Cypress run, and never ask the user to do it or confirm it — restart it yourself, silently, every time. Stale data produces misleading failures and wastes iteration cycles.
- **NEVER run the backend under test with `local`/`local,testdata`** for a Cypress run — use `e2e`. Config that only exists in `application-e2e.yml` (e.g. `tafeladmin.storage.scannerPath`, which e2e fixtures write into via a Cypress `fs` task) won't be there under the local profile, producing failures that look like a frontend/backend bug but are just a profile mismatch. Don't "fix" that by adding e2e-only config to `application-local.yml` either — keep e2e concerns in `application-e2e.yml` and just run with the right profile.
- Never modify a Cypress test to "make it pass" — if the test catches a real bug, fix the bug
- Use `cy.intercept()` to assert on network requests, not just DOM state
- **Empty screenshots do NOT mean a test passed.** Screenshots may capture any lifecycle stage and are not authoritative — always check the actual Cypress test output for pass/fail status and error messages.
- **Do NOT assume a test is flaky just because it passes in isolation but behaves differently in the full suite.** This pattern often indicates state contamination (missing testdata, unclean state between specs, order-dependent behavior). Investigate the actual failure cause before labeling a test "flaky."
- **Never make assumptions from partial evidence.** When evidence is unclear about the actual test failure, dig deeper yourself (logs, screenshots, videos, source) rather than guessing — but do not block on the user for process/state questions covered by this workflow (restarts, server startup) since those are fully automated.
