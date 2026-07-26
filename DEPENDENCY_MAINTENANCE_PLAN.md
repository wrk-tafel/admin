# Dependency Maintenance Plan

Audit date: 2026-07-26. Full dependency list (frontend `package.json` + backend
`gradle/libs.versions.toml`) was checked against npm/Maven Central publish
history and GitHub repo status. Everything not listed below was confirmed
actively maintained (recent releases within the last few months to ~1 year,
several with active next-major work in progress: Angular 22, RxJS 8-alpha,
Day.js 2.0-alpha, Spring Boot 4.1, Spring Modulith 2.1, Kotlin 2.4, Testcontainers,
MockK, ArchUnit, BouncyCastle, Passay, Apache FOP/PDFBox/Commons).

Five dependencies are stale/abandoned. Ordered below by recommended priority
(production impact first, then test/dev-only).

---

## 1. `logback-jackson` / `logback-json-classic` (backend) — HIGH PRIORITY

- **Status:** Last released 2016-06-10 (`ch.qos.logback.contrib`, ~10 years stale).
- **Used in:** `backend/src/main/resources/logback-console-json.xml` — the
  production JSON console log encoder (`JsonLayout` + `JacksonJsonFormatter`).
- **Why it matters:** This is the only stale dependency that runs in
  production, not just tests/tooling.
- **Replacement:** `net.logstash.logback:logstash-logback-encoder` — the
  actively-maintained standard JSON encoder for Logback.
- **Steps:**
  1. Add `net.logstash.logback:logstash-logback-encoder` to
     `gradle/libs.versions.toml` + `backend/build.gradle.kts`, remove
     `logback-jackson`/`logback-json-classic` entries.
  2. In `logback-console-json.xml`, replace the
     `<layout class="ch.qos.logback.contrib.json.classic.JsonLayout">` block
     with `<encoder class="net.logstash.logback.encoder.LogstashEncoder">`
     directly on the appender (no `LayoutWrappingEncoder` needed — Logstash's
     encoder is a full `Encoder`, not just a `Layout`).
  3. Port over the existing settings: `timestampPattern` (was
     `timestampFormat`/`yyyy-MM-dd'T'HH:mm:ss.SSSZ`), `timeZone` (was
     `timestampFormatTimezoneId`/`Europe/Vienna`). Logstash's encoder pretty-prints
     off by default (matches current `prettyPrint=false`).
  4. Run with the JSON console profile locally, diff a sample log line
     against the old format to confirm field names/shape are acceptable
     downstream (if logs are shipped anywhere that parses specific field
     names, e.g. an ELK/Loki pipeline).
  5. `./gradlew build` + existing log-format tests (if any) to confirm.
- **Risk:** Low-medium — config-only change, but verify nothing downstream
  parses the exact JSON field names Logstash's encoder produces differently
  from the old JsonLayout output.

---

## 2. `toastr` (frontend) — HIGH PRIORITY

- **Status:** Last released 2022-06-27 (v2.1.4). 122 open issues, no visible
  recent commits, jQuery-era library. Already surfaces as a build warning
  ("Module 'toastr' used by ... is not ESM").
- **Used in:** `src/app/common/components/tafel-toastr/tafel-toastr.service.ts`
  (wraps toastr), called app-wide for success/error/info/warning messages.
- **Replacement:** `MatSnackBar` (`@angular/material`) — **already a
  dependency**, so this removes a dependency rather than adding one, and
  clears the CommonJS/ESM build warning.
  - Alternative if toastr's specific stacked/colored toast visual style is
    important to keep: `ngx-toastr` (actively maintained Angular-native
    reimplementation, same visual behavior, easy near-drop-in for the
    `.success()/.error()/.info()/.warning()` API).
- **Steps (MatSnackBar path):**
  1. Find all call sites of `TafelToastrService` (`success`/`error`/`info`/`warning`).
  2. Rewrite `tafel-toastr.service.ts` internals to use `MatSnackBar.open(...)`
     with a custom `panelClass` per severity (success/error/info/warning) for
     styling, keeping the existing public method signatures so call sites
     don't need to change.
  3. Add SCSS for the 4 severity panel classes (color/icon) to roughly match
     current toastr look, or accept Material's default snackbar look.
  4. Remove `toastr` + `@types/toastr` from `package.json`, remove the now
     redundant `toastr` entry from `angular.json`'s `allowedCommonJsDependencies`.
  5. Update/adjust any Cypress e2e assertions that check for toastr-specific
     DOM structure/classes (grep `cypress/` for `toast`).
  6. `npm run lint && npm run test-ci && npm run build-prod` + a full Cypress
     run.
- **Risk:** Medium — touches a widely-used shared service; visual regression
  risk is the main concern, functional risk is low since the service's public
  API can stay the same.

---

## 3. `html5-qrcode` (frontend) — MEDIUM PRIORITY

- **Status:** Last released 2023-04-15 (v2.3.8). README states the project is
  explicitly in maintenance mode: *"the author shall not be able to make any
  bug fixes or improvements... looking for new owners"*. 410 open issues, 31
  open PRs.
- **Used in:** checkin module — QR code scanning for customer check-in via
  handheld scanners.
- **Replacement options:**
  - `qr-scanner` (nimiq/qr-scanner) — small, actively maintained, uses the
    native `BarcodeDetector` API where available with a WASM fallback.
    Recommended default.
  - `@zxing/browser` + `@zixng/library` — more format coverage / more
    battle-tested across browsers if `qr-scanner` proves insufficient for the
    handheld scanner hardware in use.
- **Steps:**
  1. Identify all `html5-qrcode` usage (likely concentrated in the checkin
     module's scanner component).
  2. Spike `qr-scanner` against the actual handheld scanner hardware used in
     the field — this is the biggest unknown, since the current library was
     presumably chosen for specific device compatibility. **Do this before
     committing to the swap.**
  3. Replace the scan-start/stop/result-callback wiring; adjust for API
     differences (constructor options, camera selection, torch/flash toggle
     if used).
  4. Update `checkin.component.spec.ts` and any Cypress `scanner.cy.ts` /
     `checkin.cy.ts` specs that mock or exercise the scanner.
  5. Manual test against real hardware before merging (this is exactly the
     kind of change `npm test`/Cypress-headless can't fully validate).
- **Risk:** Medium-high — this is a hardware-facing integration, not just a
  library swap. Budget time for physical device testing.

---

## 4. `cypress-browser-permissions` (frontend, dev-only) — LOW PRIORITY

- **Status:** Last released 2022-04-28 (v1.1.0), 4+ years stale.
- **Confirmed already broken:** this is the actual root cause of a
  pre-existing `tsc` error found during the Day.js migration —
  `'Cypress' has no exported member named 'BrowserLaunchOptions'` — Cypress
  renamed that type since this plugin's last release. (Left alone at the
  time since it predates that work and Cypress's own bundler tolerates it.)
- **Used for:** granting camera permission in Cypress e2e tests (checkin/scanner
  specs).
- **Steps:**
  1. Check whether Cypress's own built-in launch options
     (`--use-fake-ui-for-media-stream`, or `browser:launch` event handler
     setting Chrome flags directly in `cypress/plugins/index.ts` or
     `cypress.config.ts`) can grant camera access without a plugin at all —
     Cypress added more native support for this over time, so the plugin may
     simply no longer be needed.
  2. If a plugin is still needed, check for actively maintained alternatives
     before reinstating the same one.
  3. Remove the dependency once confirmed working, which also clears the
     `BrowserLaunchOptions` type error.
- **Risk:** Low — dev/CI tooling only, no production impact.

---

## 5. `image-comparison` (backend, test-only) — LOW PRIORITY

- **Status:** `com.github.romankh3:image-comparison`, last released
  2021-03-28, 5+ years stale.
- **Used in:** `PDFServiceTest.kt`, `HouseholdPdfServiceTest.kt`,
  `DistributionServiceTest.kt` — pixel-diffing generated PDFs against
  reference images, with diff images written out on failure for debugging.
- **Replacement:** No actively-maintained, purpose-built Java equivalent
  found (checked — this niche has mostly moved to JS/Node tooling). Recommended
  path is a small in-house utility rather than trading one unmaintained
  dependency for another:
  - Write a ~50-line `BufferedImage`-based pixel-diff utility: load both
    images via `ImageIO`, compare pixel-by-pixel (or in blocks), compute a
    difference percentage against a threshold, and optionally render a diff
    image (e.g., highlight differing pixels in red) to the existing
    `comparisonResultDirectory` output path so the debugging workflow doesn't
    regress.
  - Keep the same test-facing shape (`compareImages(expected, actual):
    ComparisonResult` with a match/mismatch state) so the 3 test files don't
    need structural changes, just the import/call site.
- **Steps:**
  1. Write the utility + a unit test for it (feed it two identical images,
     two different images, and confirm it produces a sane diff image).
  2. Replace `ImageComparison`/`ImageComparisonState` usage in the 3 test
     files with the new utility.
  3. Remove `com.github.romankh3:image-comparison` from
     `gradle/libs.versions.toml` + `backend/build.gradle.kts`.
  4. Run the 3 affected test classes, confirm diff images still get written
     on an intentionally-broken PDF template to validate the failure-debugging
     path still works.
- **Risk:** Low — test-only, no production exposure, and the reimplementation
  is small/contained.

---

## Suggested execution order

1. `logback-jackson`/`logback-json-classic` → `logstash-logback-encoder` (prod-facing, low risk, quick win)
2. `toastr` → `MatSnackBar` (removes a dependency, clears a build warning)
3. `cypress-browser-permissions` (check if even still needed — might be a pure deletion)
4. `image-comparison` → in-house utility (contained, test-only)
5. `html5-qrcode` → `qr-scanner` (needs physical hardware testing — schedule accordingly, don't rush)
