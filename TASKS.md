# TODO

Refined 2026-07-27, verified against the current codebase line-by-line (not just
described from memory) so each DO item can be implemented without further
research. Where something genuinely can't be resolved by reading code, it's
listed under MAYBE with the specific open question instead of guessed at.

---
# DO

1. **Add file upload / documents to customer details** (merges both TODO occurrences)
   * Storage: local disk/volume (per user decision, 2026-07-27). Add `documentsPath: String` to a new nested properties class under `TafelAdminProperties` (`TafelAdminProperties.kt`, same pattern as its existing `mail` property), bound as `tafeladmin.storage.documentsPath`.
   * New `DocumentEntity` (own table `household_documents`, `@ManyToOne` to `HouseholdEntity`, matching the `BaseChangeTrackingEntity` pattern used everywhere else): `household`, `person` (nullable `@ManyToOne` to `PersonEntity`, for per-person docs like school enrollment), `documentType` (`@Enumerated(EnumType.STRING)`: `PROOF_OF_INCOME`, `ID`, `SCHOOL_ENROLLMENT`, `OTHER`), `fileName`, `contentType`, `storagePath`, `uploadedByUser` (`@ManyToOne UserEntity`).
   * Backend, new controller under `modules/household` (gated by `hasAuthority('CUSTOMER')`, matching every other household-mutating endpoint): `POST /api/households/{id}/documents` (multipart), `GET /api/households/{id}/documents`, `GET /api/households/{id}/documents/{docId}` (download, stream from `documentsPath`), `DELETE /api/households/{id}/documents/{docId}`.
   * Cascade: add `documents` as a `@OneToMany(cascade = [CascadeType.ALL], orphanRemoval = true)` on `HouseholdEntity` next to `persons` (`HouseholdEntity.kt:105-106`) so deleting a household deletes its document rows (the on-disk files themselves need an explicit delete in `HouseholdService.deleteHouseholdByHouseholdId`, since JPA cascade won't remove files from disk).
   * Decided limits (locked in, not just an assumption): allowed types `application/pdf, image/jpeg, image/png`; max 10 MB per file — enforced both by a `spring.servlet.multipart.max-file-size` bump if needed and explicit content-type/size checks in the service (reject with a `TafelValidationException`, same pattern as everywhere else in this codebase).
   * Frontend: new "Dokumente" section in `customer-detail` view — upload button (type dropdown + file picker), list with type/date/uploader, download/delete actions.

2. **Improve customer-creation / search before creating (avoid duplicates)** (merges the duplicate "enforce search before creating" entry)
   * Decision (per user 2026-07-27): warn + override, not a hard block.
   * The existing `confirm-customer-save-dialog` (`confirm-customer-save-dialog.component.ts`) is *not* duplicate-related today — it's a generic "retry with `force=true`" dialog already wired end-to-end for the income-limit-exceeded case: `HouseholdService.createHousehold`/`updateHousehold` (`HouseholdService.kt:52-69`, `86-110`) throw `TafelValidationException(message, status = HttpStatus.CONFLICT)` when `!force`; `customer-edit.component.ts:99-111` catches the 409, shows `ConfirmCustomerSaveDialog` with the error message, and on confirm retries the same API call with `force=true`.
   * Reuse this exact mechanism for duplicates instead of building a new dialog: add a duplicate check in `createHousehold`/`updateHousehold` — when `!force`, call a new `HouseholdDuplicationService` method (e.g. `findSimilarHouseholds(firstname, lastname, addressStreet, addressHouseNumber, addressDoor, excludeHouseholdId)`, reusing the same soundex/levenshtein SQL conditions as `HouseholdDuplicationService.kt:47-74` but parameterized against the in-flight (not-yet-saved) household instead of self-joining already-persisted rows) and throw the same `TafelValidationException(..., CONFLICT)` listing the matches if any are found. No frontend changes needed at all — the 409 → dialog → retry-with-force flow already exists.
   * Known trade-off to flag, not fix: `force` is a single flag guarding both checks, so confirming past a duplicate warning also silently bypasses the income-limit check on the same retry (and vice versa) if both apply to the same household. This matches the existing "force = trust me, save it" intent and isn't a regression — just worth knowing going in.
   * Files: `HouseholdService.kt`, `HouseholdDuplicationService.kt` (new method).

3. **Overview: new + renewed households of last distribution**
   * Decision (per user 2026-07-27): scope = new households + renewed households (not a full audit log).
   * No schema changes needed — `HouseholdEntity` already has everything required: `createdAt` (from `BaseChangeTrackingEntity`) for "new", and `prolongedAt` (`HouseholdEntity.kt:89-90`) which `HouseholdConverter.kt:48-53` already sets to `LocalDateTime.now()` whenever `validUntil` is extended on save — i.e. "renewed" tracking already exists today, it's just not surfaced anywhere.
   * New endpoint, e.g. `GET /api/households/overview?distributionId=...` (default: latest distribution, via `DistributionRepository.getCurrentDistribution()`/`findFirstByOrderByIdDesc()`), backed by a `HouseholdRepository` query filtering `createdAt` or `prolongedAt` between the target distribution's `startedAt` and (`endedAt` or `now()` if still open) — same date-window pattern the app already uses via `DistributionEntity.startedAt/endedAt`.
   * Frontend: new overview view, distribution selector (defaults to latest, reusing the existing `/api/distributions` list), grouped "Neu"/"Verlängert" sections.
   * Files: `HouseholdRepository.kt` (new query), new controller endpoint, new frontend view. No entity/migration changes required.

4. **Report for Schulstartpakete**
   * Port the SQL already in `_reporting/reporting.sql` into a real endpoint in the `reporting` module.
   * Age range: reuse the existing `StaticValueType` mechanism (`StaticValueEntity.kt`, same table already used for `INCOME_LIMIT` etc.) rather than the entity's `amount`/adult-child-count fields — add two new enum values `SCHULSTARTPAKET_AGE_MIN`/`SCHULSTARTPAKET_AGE_MAX` and store the threshold in the existing `age: Int?` column (leave `amount`/`countAdults`/`countChildren` null for these rows). Look up via `StaticValueRepository.findSingleValueOfType(type, currentDate)`.
   * Permission: reuse `STATISTICS` (`UserPermissions.kt:15`) — there's no separate reporting permission today and adding one isn't warranted for a single report.
   * Expose as CSV (reuse `CsvUtil`, the same pattern `StatisticExportService` already uses) and/or an on-screen table.
   * Files: new class(es) under `modules/reporting`, `StaticValueType` enum + a migration seeding the two new rows, `CsvUtil`.

5. **statistic: add alleinerzieher (single-parent) flag**
   * Add a nullable `singleParent: Boolean?` column to `HouseholdEntity` (next to `pendingCostContribution`, `HouseholdEntity.kt:102-103`) — it's a household-level attribute (there's exactly one main person per household, `mainPerson`, `HouseholdEntity.kt:52-54`), not a per-person one.
   * Surface it as a checkbox in `customer-form.component.ts`'s schema (same pattern as the other boolean-ish fields there).
   * Add a corresponding metric to `StatisticsController`/`StatisticsService` (count of `singleParent == true` among valid households) and include it in the CSV export path (`StatisticExportService`).
   * Files: `HouseholdEntity.kt`, migration for the new column, `customer-form` component, `StatisticsController.kt`/`StatisticsService.kt`.

6. **customer-creation: postal code validation**
   * Decision (per user 2026-07-27): warn, don't block.
   * The form uses Angular Signal Forms (`@angular/forms/signals`, `customer-form.component.ts:2`) where `validate(schemaPath..., pattern(...))` (line 101) registers a *blocking* form error — there's no built-in non-blocking "warning" concept in this schema API. Implement the warning as a separate `computed()` signal reading `this.customerForm.address.postalCode().value()` (not registered via `validate()`), and show it as a non-blocking hint in `customer-form.component.html` next to the postal code field when the value isn't `1010` or `1030`. The existing 4-digit `pattern()` validator (line 101) stays as-is (that one should keep blocking — it's a format check, not the district rule).
   * Files: `customer-form.component.ts`/`.html`.

7. **Edit Route: contact-person editable + person-select dropdown with search/auto-create**
   * Decision (per user 2026-07-27): build now.
   * Correction from the first pass: "contact person" isn't a `Route` field at all — it's `ShopEntity.contactPerson` (`ShopEntity.kt:32-33`), a plain `String?` column on the Shops a route visits (`RouteStopEntity` → `ShopEntity`, via `RouteController.getShopsOfRoute()`/`ShopService.getShopsForRouteId()`). There is currently **no** `ShopController` and **no** write endpoint for shops at all — `RouteController.kt` is entirely `GET`-only, and the `Shop` response model (`ShopService.kt:21-30`) doesn't even expose `contactPerson` today.
   * Because `contactPerson` is a plain string (no FK to any person-like entity), a real "search dropdown + auto-create" needs a new lightweight entity, e.g. `ShopContactPersonEntity` (`firstname`, `lastname`, `phone` — same shape as `EmployeeEntity`, `EmployeeEntity.kt`), with `ShopEntity.contactPerson: String?` replaced by `@ManyToOne contactPerson: ShopContactPersonEntity?`. Build a new `ShopContactApiService`/`ShopContactController` (search + create) and a new `ShopContactSearchCreateComponent`, structurally mirroring `TafelEmployeeSearchCreateComponent` (`tafel-employee-search-create.component.ts`) + its `SelectEmployeeDialogComponent`/`CreateEmployeeDialogComponent` pair — but as new components, since the existing ones are hardwired to `EmployeeApiService`/`EmployeeData`.
   * Backend: new `ShopController` with `PUT /api/shops/{id}` to update `contactPerson` (and other shop fields as needed for a real edit UI).
   * Files: `ShopEntity.kt`, new `ShopContactPersonEntity` + migration, new `ShopController.kt`, `ShopService.kt` (expose `contactPerson`, add update method), new frontend shop-edit/contact-search-create components.

8. **Test if mails are properly received with mailpit rest api**
    * Mailpit is already running in `docker-compose.yml:32-38` (SMTP on `1025`, REST/web UI on `8025`); no integration test uses it today — the existing `*MailPostProcessorTest` classes (`backend/src/test/.../postprocessors/`) are unit tests around the processors, not real-SMTP integration tests.
    * Add a backend integration test that triggers `DistributionService.sendMails()` (`DistributionService.kt:381-388`, which runs `dailyReportMailPostProcessor`/`returnBoxesMailPostProcessor`/`statisticMailPostProcessor` against a real distribution) against the Mailpit SMTP endpoint, then polls Mailpit's REST API (`GET http://localhost:8025/api/v1/messages`) to assert the expected number of emails/recipients/subjects arrived.
    * Files: new backend integration test class under `modules/distribution/internal/postprocessors` or a new `mail` integration-test package.

9. **Sec: Set cookie path to separate prod/env**
    * There's no `application-test.yml`/`application-prod.yml` (only `application-e2e.yml`/`application-local.yml` exist) — test vs. prod are the *same* Docker image, deployed to different hosts/paths via `.github/workflows/release.yml:40-57` (`deploy-test`/`deploy-prod` jobs with separate SSH targets), configured through environment variables, not Spring profiles.
    * There's already a directly analogous, already-solved case: `server.servlet.session.cookie.path: ${tafeladmin.server.relativeBaseUrl}` (`application.yml:20-21`, `74`) parameterizes the *session* cookie path via `tafeladmin.server.relativeBaseUrl` (bindable through `TAFELADMIN_SERVER_RELATIVEBASEURL` env var per deployment). The JWT auth cookie does not follow this pattern: `TafelLoginFilter.createTokenCookie()` (`TafelLoginFilter.kt:35-43`) hardcodes `cookie.path = "/"`.
    * Fix: add `relativeBaseUrl: String = "/"` to a new nested `server` property on `TafelAdminProperties` (`TafelAdminProperties.kt`, currently only has `mail`), reusing the same `tafeladmin.server.relativeBaseUrl` YAML key already set in `application.yml:74`. Change `createTokenCookie()` to take a `path: String` parameter instead of hardcoding `"/"`. Update both call sites: `TafelLoginFilter.successfulAuthentication()` (`TafelLoginFilter.kt:80`, has `applicationProperties` already) and `UserController.logout()` (`UserController.kt:68`, needs `TafelAdminProperties` injected). No new profile files needed — separation is already achieved per-deployment via env var overrides, exactly like the session cookie already is.
    * Files: `TafelAdminProperties.kt`, `TafelLoginFilter.kt`, `UserController.kt`.

10. **food recording: sonstige Kisten (add description)**
    * `FoodCollectionItemEntity` (`@Embeddable`, `FoodCollectionItemEntity.kt`) has `shop`, `category` (a `@ManyToOne FoodCategoryEntity`), `amount` — no description field. "Sonstige" is not a hardcoded category (no enum flag, no fixed ID in migrations — categories are user-managed data, e.g. `food_categories` id 10 happens to be "Sonstiges" in one environment's seed data, but that's not guaranteed/portable).
    * Decision (to avoid fragile name/ID matching against user-editable data): add a nullable `description: String?` column directly to `FoodCollectionItemEntity`/`food_collection_items`, and always show an optional free-text "Beschreibung" input for every item row in the food-collection-recording UI (not conditionally gated on category) — simplest, robust, and covers the "sonstige" case along with any other category where staff want extra detail.
    * Files: `FoodCollectionItemEntity.kt`, migration, food-collection-recording items component(s) (`frontend/.../logistics/views/food-collection-recording/`).

11. **use semantic versioning + provide jar-file releases via GitHub**
    * Decision (per user 2026-07-27): do both.
    * Current state: `backend/build.gradle.kts:11` → `version = "0.0.1-SNAPSHOT"`; frontend `package.json:3` → `"version": "0.0.1"`. Replace both with a real semver value, bumped per release (manual bump is fine to start; a plugin like `axion-release-plugin` can automate it later but isn't required for a first cut).
    * `.github/workflows/release.yml` already builds+tests+deploys both `test` and `prod` image tags on every push to `release` (lines 1-57) but never creates a GitHub Release — `subflow_build.yml` only uploads the jar as a 1-day CI artifact. Add a new job to `release.yml` (after `build`/`test`) that publishes the built jar as a GitHub Release asset (e.g. `softprops/action-gh-release`), tagged with the version. This new job needs its own `permissions: contents: write` block — every other privileged job in this repo declares permissions explicitly per-job (`subflow_docker_image.yml:19-21`, `dependabot_gradle_lockfile.yml:25-26`), so follow the same pattern rather than relying on repo-wide defaults.
    * Files: `build.gradle.kts`, `package.json`, `.github/workflows/release.yml`, `subflow_build.yml`.

12. **impro 5: Maybe decouple reporting from closing? Favor auto-closing** *(moved from MAYBE — the missing design piece turned out to already be answered by existing code)*
    * Goal (per user 2026-07-27): distributions should auto-close instead of requiring a manual close action.
    * `DistributionService.validateClose()` (`DistributionService.kt:210-255`) already computes exactly the right signal: it returns `errors` (blocking: no active distribution, missing statistics, incomplete routes) and `warnings` (routes not collected at all). Today a manual close either succeeds outright (no errors/warnings) or requires the human to click "force close" past warnings (`DistributionController.closeDistribution(forceClose)`, `DistributionController.kt:86-100`).
    * Concrete trigger: auto-close whenever `validateClose()` would return zero errors *and* zero warnings — i.e. auto-invoke `closeDistribution()` right after whichever save action most recently made that true (after `saveDistributionStatistic`, after the last food-collection route is saved, or after the last ticket is processed — call `validateClose()` after each of those and close if clean). No polling/scheduler needed.
    * "How to deal with multiple distributions": already handled — `createNewDistribution()` (`DistributionService.kt:62-90`) already throws `TafelValidationException("Ausgabe bereits gestartet!")` if one is open, so only one distribution can ever be active at a time; auto-close doesn't need any new concurrency handling.
    * Files: `DistributionController.kt`/`DistributionService.kt` (trigger auto-close from the relevant save endpoints).

---
# MAYBE

* **duplicates (customers) showing late?** — `HouseholdDuplicationService.findDuplicates()` (`HouseholdDuplicationService.kt:78-105`) runs a live, uncached SQL query every call, so "late" isn't caused by any caching layer. One concrete oddity worth flagging for whoever investigates next: `loadDuplicates()` is called with `PageRequest.of(page?.minus(1) ?: 0, 1)` (`HouseholdDuplicationService.kt:79`) — page **size** 1, i.e. exactly one duplicate-group shown per "page" — which may be the actual source of the "already there but only shown now" confusion (a genuine duplicate could be sitting on page 2+ and simply not visible without paging). Still needs a repro (exact steps/timing) from whoever reported it before committing to a fix.

* **All forms - change to updateOn: 'blur'** — broad UX change across every reactive form in the app; no `updateOn` usage exists today (confirmed via full-repo search). Low urgency, no reported pain point driving it — keep as backlog rather than committing now.

* **switch to signals** — Angular 22 is in place and one service (`global-state.service.ts`) already uses `signal()`/`computed()`, but converting the rest of the app is a large, low-priority refactor with no immediate driver.

* **Improve module communication by using async events (Spring Modulith) / persist events in db and re-process** — `spring-modulith-starter-jpa`/`actuator`/`test` are already on the classpath (`backend/build.gradle.kts:43,56,57,86,92`), but zero `ApplicationEventPublisher`/`@ApplicationModuleListener` usage exists yet. Needs a concrete target interaction (which two modules, which action) before it's worth speccing — currently too open-ended to implement confidently.

---
# NOT DO

* **impro 5: scanner-phones, 3d modeling table-holders** — hardware/procurement task (buying scanner phones, 3D-printing table holders), confirmed out of scope for code changes (per user 2026-07-27).

---
## Done (validated 2026-07-27)
* Static values manageable via UI - implemented 2026-07-27: scope (per user 2026-07-27) is maintain-only, not full CRUD - no new rows can be added, and only `amount` is editable on existing rows (type/validFrom/validTo/countAdults/countChildren/age are shown for context but read-only, since they identify which row a lookup matches). Added `GET /api/settings/static-values` + `POST /api/settings/static-values/{id}` (amount-only) to the existing `SettingsController`/`SettingsService`; no create endpoint exists. Kept `StaticValueRepository`'s `@Cacheable` annotations and `CacheConfig` (added the same day this branched off, specifically to fix N+1 queries behind `getHouseholdsAboveLimit()` - dropping them would have silently undone that fix) and instead added `@CacheEvict(allEntries = true)` to `updateStaticValue`, so admin edits still take effect immediately without a restart. New "Statische Werte" settings page + edit dialog (read-only fields + one editable amount input), wired into `settings.routes.ts`/nav under the existing `SETTINGS` permission; fixed a latent `testdata.sql` bug (`'INCOME_TOLERANCE'` didn't match any enum constant, so e2e/local seeded data would fail to load once read via `findAll()`); added `base::exception` to the `settings` module's Spring Modulith `allowedDependencies`. Verified end-to-end against a running backend+DB (list/edit-amount/read-only fields) and via new Cypress spec `settings-static-values.cy.ts`; also added an integration test proving the cache is actually evicted on write (`SettingsServiceStaticValueCacheIT`).
* Add overview "Customers above limit" + permission - implemented 2026-07-27: CUSTOMERS_ABOVE_LIMIT permission added; GET /api/households/above-limit (HouseholdService.getHouseholdsAboveLimit()) re-validates every currently-valid household against IncomeValidatorService and returns those over the limit with totalSum/limit/amountExceededLimit; new "Kunden über Limit" frontend view + nav entry
* Bug: Customer in CustomerList(PDF) still visible after deletion of ticketNumber - implemented 2026-07-27: generateHouseholdListPdf() now loads households via a fresh DistributionHouseholdRepository.findByDistributionId() query instead of the currentDistribution.households association; DistributionServiceTest updated accordingly
* Route only needs a time and no separate order (sorting) - RouteStopEntity has no order field
* Route: Model extra-stops in DB (needs to part of the route, comment is not enough) - RouteStopEntity is a real JPA entity (routes_stops table), separate from Route's free-text note
* Validation necessary for KM Abfahrt < KM Ankunft - implemented (kmValidation error) and covered by tests in food-collection-recording-basedata
* Goods recording - tests in FoodCollectionRecordingComponent - .spec.ts files exist for the component and siblings
* Add "supervisor" role (can force-fully create customers even when exceeding the income limit) - UserPermissions.kt defines SUPERVISOR (business-logic enforcement not re-verified)
* Move statistics package into reporting ? - already merged; only modules/reporting remains, no separate statistics package in backend
* switch to control flow syntax @if, @for, @switch - 195 usages across 33 templates vs. 1 legacy *ngIf leftover (in a spec file)
* tech: switch to spring boot layered build (deployment speed) - Dockerfile already uses --layers --launcher
* Separate compile from the rest to have a faster deploy - CI already builds backend/frontend as separate jobs/artifacts from the docker/deploy stage
* impro 1: Ticket-Monitor layout-error when rendering the preview (order of tickets wrong sometimes) - moot; ticket-screen.component.ts now shows a single current-ticket SSE value, no list/ordering exists anymore
* ticketmonitor control shows nothing when loaded initially - backend now sends initial state on SSE connect
* Menu/navigation: Fix menu when collapsed - first character of text is shown - default-layout.component.html removes label spans from the DOM entirely via @if(!collapsed()), no truncation artifact possible
* Statistics Module: Show charts / CSV Export - StatisticsController (/api/statistics/data, /generate-csv), StatisticExportService, frontend statistics-panel.component.ts (ng2-charts)
