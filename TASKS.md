# TODO

# Prio 1
* food recording: sonstige kisten (add function to add a description) - how?

* Improve performance of statistics page (issue in prod only)

* Add overview "Customers above limit"
* New permission : ADMIN, Duplicates / Settings / Customers above limit

* Add file upload / documents (e.g. for proof of income, school enrollement, ID, etc.) to customer details
* Bug: Customer in CustomerList(PDF) still visible after deletion of ticketNumber! - caching?
* feat: Overviewpage: prolonged and new customers (all actions) of last distribution (selection for distribution?)

* feat: Improve customer-creation / search before creating to avoid duplicates

* Statistics Module: Show charts / CSV Export
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

# Rest
* impro 1: Ticket-Monitor layout-error when rendering the preview (order of tickets wrong sometimes)

* impro 5: scanner-phones, 3d modeling table-holders
* impro 5: Maybe decouple reporting from closing? Favor auto-closing, how to deal with multiple distributions?

* duplicates (customers) showing late? - current duplicate already longer there but only shown now

* ticketmonitor control shows nothing when loaded initially

* customer-creation: Advanced postalCode validation (only numbers from 03. and 01. district / Vienna)
* Improve creation / enforce search before creating
* Add "supervisor" role (can force-fully create customers even when exceeding the income limit)
* Menu/navigation: Fix menu when collapsed - first character of text is shown

statistic:
* add alleinerzieher flag

## LTL
* Goods recording - tests in FoodCollectionRecordingComponent

* Edit Route / also contact-person needs to be editable
* Edit route - Person-select (Dropdown) incl. Search?
  * Auto-create persons without dedicated maintenance
* Route only needs a time and no separate order (sorting)
* Validation necessary for KM Abfahrt < KM Ankunft
* Route: Model extra-stops in DB (needs to part of the route, comment is not enough)

### Open things (to be decided)

* All forms - change to updateOn: 'blur' ?
* customer-detail
  * add document upload
* use semantic versioning ?
* provide jar-file releases via github ?
* Move statistics package into reporting ?

### Lower prio
* switch to signals
* switch to control flow syntax @if, @for, @switch

* tech: switch to spring boot layered build (^ deployment speed): https://www.baeldung.com/docker-layers-spring-boot

* Improve module communication by using async events (https://docs.spring.io/spring-modulith/docs/current/reference/html/#events)
  * also persist events in db and re-process maybe

### Tech

* Separate compile from the rest to have a faster deploy
* Test if mails are properly received with mailpit rest api
* Sec: Set cookie path to seperate prod/env (even when the token is not accepted)
