# TODO

# Prio 1
* food recording: sonstige kisten (add function to add a description) - how?

* Add overview "Customers above limit"
* New permission : ADMIN, Duplicates / Settings / Customers above limit
  * PARTIAL: CUSTOMER_DUPLICATES and SETTINGS permissions already exist (UserPermissions.kt); "Customers above limit" permission still missing (depends on the overview above)

* Add file upload / documents (e.g. for proof of income, school enrollement, ID, etc.) to customer details
* Bug: Customer in CustomerList(PDF) still visible after deletion of ticketNumber! - caching?
  * Not a caching issue - no Spring cache config exists at all. Likely cause: DistributionService.generateHouseholdListPdf() reads currentDistribution.households (lazy @OneToMany) which goes stale after deleteCurrentTicket() deletes the row directly via repository without refreshing the parent's collection.
* feat: Overviewpage: prolonged and new customers (all actions) of last distribution (selection for distribution?)

* feat: Improve customer-creation / search before creating to avoid duplicates
  * PARTIAL: a confirm-customer-save-dialog exists, but there's no enforced search-before-create step

* Statistics Module: Show charts / CSV Export
  * DONE - StatisticsController (/api/statistics/data, /generate-csv), StatisticExportService, frontend statistics-panel.component.ts (ng2-charts)
* Report for Schulstartpakete:
  * Show all customers/children suitable for Schulstartpaket
  * SQL: SELECT c.customer_id, cap.firstname, cap.lastname, AGE(CURRENT_DATE, cap.birth_date), COUNT(CASE WHEN DATE_PART('YEAR', AGE(CURRENT_DATE, cap.birth_date)) BETWEEN 6 AND 10 THEN 1 END) AS period
    FROM customers_addpersons cap
    JOIN customers c ON cap.customer_id = c.id
    WHERE c.valid_until >= CURRENT_DATE
    GROUP BY c.customer_id, cap.firstname, cap.lastname, cap.birth_date
    HAVING COUNT(CASE WHEN DATE_PART('YEAR', AGE(CURRENT_DATE, cap.birth_date)) BETWEEN 6 AND 10 THEN 1 END) >= 1
    ORDER BY c.customer_id;
  * Age maybe configurable
  * OPEN: only exists as a standalone script in _reporting/reporting.sql, not wired into the app (no controller/service/UI)

# Rest
* impro 5: scanner-phones, 3d modeling table-holders
* impro 5: Maybe decouple reporting from closing? Favor auto-closing, how to deal with multiple distributions?

* duplicates (customers) showing late? - current duplicate already longer there but only shown now
  * Duplicate detection itself is implemented (HouseholdDuplicationService, live SQL soundex/levenshtein query, no caching) - the specific "shows late" timing issue still needs its own repro/investigation

* customer-creation: Advanced postalCode validation (only numbers from 03. and 01. district / Vienna)
* Improve creation / enforce search before creating
* Menu/navigation: Fix menu when collapsed - first character of text is shown

statistic:
* add alleinerzieher flag

## LTL
* Edit Route / also contact-person needs to be editable
* Edit route - Person-select (Dropdown) incl. Search?
  * Auto-create persons without dedicated maintenance
  * OPEN: no route-edit UI exists yet at all (RouteController only has GET endpoints). Note: the desired search+auto-create pattern is already implemented for drivers in tafel-employee-search-create.component.ts and could be reused.

### Open things (to be decided)

* All forms - change to updateOn: 'blur' ?
* customer-detail
  * add document upload
* use semantic versioning ?
* provide jar-file releases via github ?

### Lower prio
* switch to signals
  * PARTIAL: Angular 22 in use; only global-state.service.ts actually uses signal()/computed() so far, not broadly adopted

* Improve module communication by using async events (https://docs.spring.io/spring-modulith/docs/current/reference/html/#events)
  * also persist events in db and re-process maybe
  * PARTIAL: spring-modulith-starter-jpa/actuator/test already added to build.gradle.kts, but no ApplicationEventPublisher/@ApplicationModuleListener usage anywhere yet - infra present, unused

### Tech

* Test if mails are properly received with mailpit rest api
* Sec: Set cookie path to seperate prod/env (even when the token is not accepted)
  * TafelLoginFilter.kt hardcodes cookie.path = "/" regardless of profile

---
## Done (validated 2026-07-27)
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
