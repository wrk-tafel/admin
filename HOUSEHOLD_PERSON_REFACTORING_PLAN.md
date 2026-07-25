# Refactoring Plan: `customers`/`customers_addpersons` → `households`/`persons`

## 1. Problem statement

Today, `customers` conflates two concepts: the **household/case** (business id, address,
contact, valid-until, lock state, cost contribution, issuing employee) and the **main
person** (firstname, lastname, birth date, gender, country, employer, income). Every other
household member lives in `customers_addpersons`, which is a strict, second-class child row
(no independent address, no DB-level FK, fewer fields) linked via `customer_id`.

Business language already treats this as a **household** (see `HouseholdSizeDistributionExporter`,
"Haushalte" columns in statistics exports, `exclude_household`/`receives_familybonus` fields) —
the code just hasn't caught up.

**Target model:**
- `households` — the case: business number, address, contact, valid-until/lock/cost-contribution
  state, issuing employee, and a pointer to its main person.
- `persons` — every household member, including the main person, marked via `is_main_person`.
  Exactly one main person per household.

## 2. Guiding principles

1. **No data loss, ever.** Every migration step is additive until a final, explicit cleanup
   step — and that step only runs after production verification.
2. **Reuse existing primary keys.** `customers.id` and `customers_addpersons.id` are both drawn
   from the single shared `hibernate_sequence` (see `R__00005_create_hibernate_sequence.sql`),
   so their id spaces have **never collided**. This means data migration can carry `id` values
   straight across into `households`/`persons` — no id remapping table, no need to rewrite the
   FK columns on `customers_notes` / `distributions_customers` beyond a rename, and no risk of
   collision with future ids (the sequence just keeps counting up).
3. **Idempotent, re-runnable SQL.** This project's Flyway setup uses only repeatable (`R__`)
   migrations, applied once per checksum, with `baseline-on-migrate: true` and no down-migrations.
   Every statement in the migration must tolerate being re-run after a partial failure
   (`where not exists`, `on conflict do nothing`, `add column if not exists`), matching the
   existing style in this repo (e.g. `R__00020_migration_adaptions.sql`).
4. **Backend + frontend move together.** This is a single full-stack repo, deployed as a single
   instance (stop/start, confirmed in decision A below) — so there's no need for a dual-read/
   dual-write compatibility layer inside the application. Schema migration and dependent code
   ship in one coordinated release.
5. **Old tables stay until proven safe.** `customers`/`customers_addpersons` are not touched
   (not even read-only-locked) until the new tables are verified in production. The drop is its
   own separate, later migration.

## 3. Decisions (confirmed)

- **A. Deployment model: single instance, stop/start.** Confirmed by `subflow_deploy.yml`
  (SSH deploy command onto one server) and `docker-compose.yml` (single app container). Old and
  new app code never run concurrently against the DB, so **no dual-write/expand-contract phase
  is needed** — the schema migration and dependent code (including the FK-redirect / rename step
  in Phase 1) can ship together in a single coordinated release, as originally planned.
- **B. Notes and distribution/ticket assignment stay at household level**, unchanged from today
  — `customers_notes` → `household_notes` and `distributions_customers` → `distributions_households`
  are pure renames (table + FK column), not restructured to attach to individual persons.
- **C. Full rename, same rollout.** The public REST paths (`/api/customers` → `/api/households`)
  and frontend routes/module names are renamed in the **same** PR/release as the DB and backend
  entity rename, not deferred to a separate phase. Since backend and frontend already ship
  together (single coordinated release per decision A), there's no added deployment risk in
  including the public-facing rename now — it just needs to be part of the same code change.
  Phase 6 (below) is therefore **folded into Phases 3–5**, not a separate later step.
- **D. Retention window: 1–2 weeks.** Old tables (`customers`, `customers_addpersons`) are kept,
  unused, for 1–2 weeks of production observation after cutover before the cleanup migration
  (Phase 8, step 6) drops them.

## 4. Target schema

```sql
create table if not exists households
(
    id                         bigint primary key,
    created_at                 timestamp    not null,
    updated_at                 timestamp    not null,
    household_id               bigint       not null unique,   -- business number, was customers.customer_id (NOT the surrogate PK `id`)
    employee_id                bigint       null references employees(id),
    main_person_id             bigint       null,              -- FK added after persons exists
    address_street              varchar(100) null,
    address_housenumber         varchar(100) null,
    address_stairway            varchar(5)   null,
    address_postalcode          integer      null,
    address_door                varchar(10)  null,
    address_city                varchar(100) null,
    telephone_number             varchar(100) null,
    email                       varchar(100) null,
    valid_until                 date         null,
    locked                      bool         null,
    locked_at                   timestamp    null,
    locked_by                   bigint       null references users(id) on delete set null,
    lock_reason                 text         null,
    migrated                    bool         null,
    migration_date               date        null,
    prolonged_at                 timestamp   null,
    pending_cost_contribution     numeric     not null default 0
);

create table if not exists persons
(
    id                    bigint primary key,
    created_at            timestamp    not null,
    updated_at            timestamp    not null,
    household_id          bigint       not null references households(id) on delete cascade,
    is_main_person        bool         not null default false,
    firstname             varchar(50)  null,
    lastname              varchar(50)  null,
    birth_date            date         null,
    gender                varchar(10)  null,
    country_id            bigint       null references static_countries(id),
    employer              varchar(100) null,
    income                decimal      null,
    income_due            date         null,
    exclude_household      bool        not null default false,
    receives_familybonus   bool        not null default false
);

-- exactly one main person per household
create unique index if not exists uq_persons_household_main
    on persons (household_id) where is_main_person = true;

create index if not exists idx_persons_household_id on persons (household_id);
```

> **Naming note**: `households.household_id` is the unique *business* number (mirrors the old
> `customers.customer_id`); it is distinct from `households.id`, the surrogate primary key.
> `persons.household_id` is a *foreign key to `households.id`* (the surrogate PK), not to
> `households.household_id`. This mirrors the exact same ambiguity that already exists today —
> `customers.customer_id` is the business number, while `customers_addpersons.customer_id`
> actually stores `customers.id` (the PK) via the JPA `@JoinColumn`, not the business
> `customer_id`. Kept intentionally consistent with existing convention rather than introducing
> new terminology (e.g. `household_number`).

> Exact nullability must be double-checked against the accumulated relaxations in
> `R__00020`, `R__00030` (several columns were made nullable after the fact) at implementation
> time — the sketch above reflects current best understanding, not a final DDL.

**Dependent tables** (redirected, not restructured — household id values are unchanged):

| Current | New |
|---|---|
| `customers_notes.customer_id` (FK → `customers.id` on delete cascade) | rename column to `household_id`, FK → `households.id` |
| `customers_notes` (table) | rename to `household_notes` |
| `distributions_customers.customer_id` (FK → `customers.id` on delete cascade) | rename column to `household_id`, FK → `households.id` |
| `distributions_customers` (table) | rename to `distributions_households` |

Since `households.id` == the old `customers.id` for every migrated row, these are pure
`rename column` + `drop/add constraint` operations — no data rewrite needed.

## 5. Migration phases

### Phase 1 — Additive schema + data migration (new Flyway script, e.g. `R__00067_household_person_refactor.sql`)

One idempotent script that:

1. Creates `households` and `persons` (as above), without the `main_person_id` FK enforced yet.
2. Copies household-level data, **preserving `id`**:
   ```sql
   insert into households (id, created_at, updated_at, household_id, employee_id,
       address_street, address_housenumber, address_stairway, address_postalcode, address_door,
       address_city, telephone_number, email, valid_until, locked, locked_at, locked_by,
       lock_reason, migrated, migration_date, prolonged_at, pending_cost_contribution)
   select id, created_at, updated_at, customer_id, employee_id,
       address_street, address_housenumber, address_stairway, address_postalcode, address_door,
       address_city, telephone_number, email, valid_until, locked, locked_at, locked_by,
       lock_reason, migrated, migration_date, prolonged_at, pending_cost_contribution
   from customers c
   where not exists (select 1 from households h where h.id = c.id);
   ```
3. Copies each customer as its household's main person, **preserving `id`** (safe: same id
   space, and this row's id equals its household's id by construction — harmless duplication of
   the numeric value across two different tables):
   ```sql
   insert into persons (id, created_at, updated_at, household_id, is_main_person,
       firstname, lastname, birth_date, gender, country_id, employer, income, income_due,
       exclude_household, receives_familybonus)
   select id, created_at, updated_at, id, true,
       firstname, lastname, birth_date, gender, country, employer, income, incomeDue,
       false, false
   from customers c
   where not exists (select 1 from persons p where p.id = c.id);
   ```
4. Copies additional persons, **preserving `id`**:
   ```sql
   insert into persons (id, created_at, updated_at, household_id, is_main_person,
       firstname, lastname, birth_date, gender, country_id, employer, income, income_due,
       exclude_household, receives_familybonus)
   select id, created_at, updated_at, customer_id, false,
       firstname, lastname, birth_date, gender, country_id, employer, income, incomeDue,
       exclude_household, receives_familybonus
   from customers_addpersons cap
   where not exists (select 1 from persons p where p.id = cap.id);
   ```
5. Backfills and locks in `main_person_id`:
   ```sql
   alter table households add column if not exists main_person_id bigint;

   update households h set main_person_id = p.id
   from persons p
   where p.household_id = h.id and p.is_main_person = true
     and h.main_person_id is distinct from p.id;

   -- only after verifying every household got one (see verification queries below)
   alter table households alter column main_person_id set not null;
   alter table households add constraint fk_households_main_person
       foreign key (main_person_id) references persons(id);
   ```
6. Redirects dependent tables (drop the old FK constraint by its real name first — look it up
   per environment, don't hardcode a guessed constraint name):
   ```sql
   alter table customers_notes rename column customer_id to household_id;
   alter table customers_notes rename to household_notes;
   alter table household_notes drop constraint if exists customers_notes_customer_id_fkey;
   alter table household_notes add constraint fk_household_notes_household
       foreign key (household_id) references households(id) on delete cascade;

   alter table distributions_customers rename column customer_id to household_id;
   alter table distributions_customers rename to distributions_households;
   alter table distributions_households drop constraint if exists distributions_customers_customer_id_fkey;
   alter table distributions_households add constraint fk_distributions_households_household
       foreign key (household_id) references households(id) on delete cascade;
   ```
7. Recreates duplication-detection indexes on the new table (soundex on `persons`/`households`
   as appropriate — duplication today only compares `customers`, so soundex indexes move to
   `households.firstname`... **note**: `firstname`/`lastname` no longer live on `households`,
   they live on the main `person` row. `CustomerDuplicationService`'s raw SQL will need a join
   `households h join persons p on p.id = h.main_person_id`, see Phase 4.

**This entire phase is purely additive** in terms of the `households`/`persons` tables —
`customers` and `customers_addpersons` are untouched. Step 6 (the rename/FK-redirect on
`customers_notes`/`distributions_customers`) is deployed together with the new entities in the
same release (single-instance stop/start deploy, decision A), so there's no window where old
running code queries the renamed columns.

### Phase 2 — Verification (run before touching any application code)

```sql
-- row counts must match
select (select count(*) from customers) as customers_count,
       (select count(*) from households) as households_count;

select (select count(*) from customers_addpersons) + (select count(*) from customers) as old_persons_total,
       (select count(*) from persons) as new_persons_total;

-- every household has exactly one main person
select household_id, count(*) from persons where is_main_person group by household_id having count(*) <> 1;
-- expect 0 rows

-- every household has a main_person_id set
select count(*) from households where main_person_id is null; -- expect 0

-- orphan check: every non-main person's household exists
select count(*) from persons p left join households h on h.id = p.household_id where h.id is null; -- expect 0
```

### Phase 3 — Backend code migration

Rename/rework in lockstep with the schema (grouped by concern; file paths from current repo state):

- **Entities & repositories**
  (`backend/src/main/kotlin/at/wrk/tafel/admin/backend/database/model/customer/`)
  - `CustomerEntity.kt` → `HouseholdEntity.kt` (table `households`), drop person fields
    (firstname/lastname/birthDate/gender/country/employer/income/incomeDue), add
    `mainPerson: PersonEntity` (`@OneToOne`/`@ManyToOne` on `main_person_id`).
  - `CustomerAddPersonEntity.kt` + person fields moved out of `CustomerEntity` → merge into a
    single `PersonEntity.kt` (table `persons`) with `isMainPerson: Boolean`,
    `household: HouseholdEntity` (`@ManyToOne`, `household_id`).
  - `CustomerRepository.kt` → `HouseholdRepository.kt`; move the `Specs` (search/filter
    specifications) — `postProcessingNecessary()`'s subquery into add-persons becomes a subquery
    into `persons` filtered by `household_id`; name/search specs need to join through
    `mainPerson` since firstname/lastname moved off the household row.
  - `CustomerAddPersonRepository.kt` → merge into a single `PersonRepository.kt`.
  - `CustomerNoteEntity.kt`/`CustomerNoteRepository.kt` → `HouseholdNoteEntity`/`HouseholdNoteRepository`
    (table `household_notes`, column `household_id`).
  - `DistributionCustomerEntity.kt`/`DistributionCustomerRepository.kt` → `DistributionHouseholdEntity`/
    `DistributionHouseholdRepository` (table `distributions_households`, column `household_id`).

- **Services** (`.../modules/customer/internal/`)
  - `CustomerService.kt` — rework income validation to build `IncomeValidatorPerson` list from
    `household.mainPerson` + all non-main persons (logic already mostly decoupled via
    `IncomeValidatorService`, low risk). `mergeCustomers` needs re-examination re: whether
    persons should be reassigned to the surviving household rather than deleted outright.
  - `converter/CustomerConverter.kt` → `HouseholdConverter.kt` — central entity↔DTO mapper;
    becomes the split point between "main person" and "additional persons" in the new DTO shape
    (`Household`/`Person`, see API/DTOs below).
  - `CustomerDuplicationService.kt` — raw JDBC SQL must switch to
    `households h join persons p on p.id = h.main_person_id` for the fields it soundex/levenshtein
    compares.
  - `masterdata/CustomerPdfService.kt` — `countPersons`/`countInfants` logic iterates persons of
    a household; update to query `persons` by `household_id` (excluding `exclude_household` ones,
    same as today).
  - `note/CustomerNoteService.kt`, `note/CustomerNoteController.kt` — repoint to
    `HouseholdNoteRepository`.

- **Distribution module** (`.../modules/distribution/internal/`)
  - `DistributionService.kt`, `postprocessors/MissingCostContributionPostProcessor.kt`,
    `ticket/DistributionTicketController.kt` — repoint to `DistributionHouseholdRepository`
    and `HouseholdEntity`.

- **API/DTOs** (full public rename, same rollout per decision C)
  - `CustomerController.kt` → `HouseholdController.kt`, `@RequestMapping` → `/api/households`.
  - `CustomerResponseModel.kt` → `HouseholdResponseModel.kt`: `Customer` → `Household`,
    `CustomerAdditionalPerson` → `Person` (with `isMainPerson`), `CustomerAddress` →
    `HouseholdAddress`, `CustomerIssuer` → `HouseholdIssuer`, `CustomerListResponse` →
    `HouseholdListResponse`, `CustomerCreationResponse`/`CustomerUpdateResponse` →
    `HouseholdCreationResponse`/`HouseholdUpdateResponse`, `ValidateCustomerResponse` →
    `ValidateHouseholdResponse`, `CustomerDuplicatesResponse`/`CustomerDuplicationItem` →
    `HouseholdDuplicatesResponse`/`HouseholdDuplicationItem`, `CustomerMergeRequest` →
    `HouseholdMergeRequest`.
  - `note/CustomerNotesResponseModel.kt`, `note/CustomerNoteController.kt` → rename to
    `HouseholdNote...`, path `/api/households/{householdId}/notes` (the business number, i.e.
    `households.household_id` — same "id-in-the-URL-is-the-business-number" convention as
    today's `{customerId}`, not the surrogate PK).
  - `distribution/internal/ticket/DistributionTicketController.kt` — path
    `/api/distributions/tickets/customers/{customerId}` → `/api/distributions/tickets/households/{householdId}`.
  - `distribution/internal/model/CustomerListPdfModel.kt` → `HouseholdListPdfModel.kt`
    (`CustomerListItem` → `HouseholdListItem`, `customerId` → `householdId`).

### Phase 4 — Reporting/statistics rewrite

- `StatisticsService.kt` — rewrite raw SQL: `countBeneficiaryCustomers` → count `households`
  (filtered by validity as today), `countBeneficiaryPersons` → `households h join persons p on
  p.household_id = h.id`, `countBeneficiaryCustomersWithChildren` → same join, filtered by
  `p.birth_date`.
- `HouseholdSizeDistributionExporter.kt`, `AgeDistributionExporter.kt`,
  `CountryDistributionExporter.kt` — update to iterate `household.persons` (or a dedicated
  query) instead of `customer.additionalPersons` + the customer's own fields.

### Phase 5 — Frontend (module rename + DTO shape, same rollout)

`frontend/src/main/webapp/src/app/modules/customer/` → rename module folder to `household/`;
`customer-api.service.ts` → `household-api.service.ts`, calling `/api/households...`.

- `household-api.service.ts` — DTOs mirror the renamed backend (`HouseholdData`, `PersonData`
  with `isMainPerson`, `HouseholdAddressData`, `HouseholdSearchResult`,
  `HouseholdDuplicatesResponse`, `HouseholdMergeRequest`).
- `components/customer-form/` → `components/household-form/` — the repeatable
  `additionalPersons` sub-form and the main person's fields (currently split: main person flat
  on the parent form, others in a repeated array) collapse into **one** repeatable persons list
  with the first/flagged entry pinned as main — likely a simplification of this component, not
  just a rename.
- `views/customer-detail/` → `views/household-detail/`, `views/customer-search/` →
  `views/household-search/`, `views/customer-duplicates/` → `views/household-duplicates/`,
  `views/customer-edit/` → `views/household-edit/`, and the three resolvers
  (`customerdata-resolver.component.ts`, `customer-duplicates-data-resolver.component.ts`,
  `customernotes-resolver.component.ts`) → `householddata-resolver.component.ts` etc. — update
  routes and DTO shape together.
- `modules/checkin/views/checkin/checkin.component.ts/.html` — reads `additionalPersons`
  directly for infant counting; update to the new `persons` list (filter out the main person or
  not, matching current infant-counting semantics either way).
- Angular route paths (e.g. `/customers/...` → `/households/...`) and any nav/menu labels
  referencing "Customer" → "Household" (check German UI labels too, e.g. "Kunde" → "Haushalt" —
  confirm the preferred German term with whoever owns the UI copy, since "Haushalt" is already
  used in statistics exports).

### Phase 7 — Test & seed data

- `backend/src/main/resources/db-migration-testdata/testdata.sql` — rewrite
  `insert into customers(...)`/`insert into customers_addpersons(...)`/`insert into
  customers_notes(...)` blocks as `households`/`persons`/`household_notes` inserts.
- `backend/src/test/resources/testdata/unittest-data.sql` — same, for Testcontainers-backed
  integration tests.
- All `*Test.kt`/`*IT.kt` under `modules/customer/**` and `database/model/customer/**` — update
  to new entity/repository names and shapes.
- PDF reference tests (`CustomerPdfServiceTest`, `backend/src/test/resources/pdf-references/customer`)
  — regenerate/verify reference PDFs still render identically (no visible behavior change
  expected, but the data path changes).

### Phase 8 — Production rollout

1. **Backup** — `pg_dump` (or managed snapshot) immediately before deploying Phase 1, regardless
   of how idempotent the script is. This is the actual "no data can be lost" safety net.
2. Deploy the release containing **both** the Flyway migration (Phase 1) **and** the new
   application code (Phases 3–5, including the full public rename) together — Flyway runs
   automatically on Spring Boot startup, before the app starts serving traffic, so
   migration-then-new-code is naturally sequenced within one deploy.
3. Run the Phase 2 verification queries against production immediately after deploy.
4. Smoke-test manually: search a household, view detail, edit (add/remove a household member),
   create a note, assign to a distribution, generate a PDF, run a statistics export.
5. Observe for **1–2 weeks** (decision D) with the old tables left in place, unused.
6. Ship the **cleanup migration**: drop `customers`, `customers_addpersons`, drop
   `customer_id_sequence` if unused (or repurpose it for `households.household_id` generation
   instead of introducing a new sequence — simpler, avoids gaps), drop now-dead code paths.

## 6. Risk register

| Risk | Mitigation |
|---|---|
| Partial failure mid-migration on production | Every insert/update guarded by `where not exists` / `is distinct from`; script is safely re-runnable; take a backup regardless. |
| `main_person_id` left null for some household (bad data upstream, e.g. a customer row with no matching person insert due to a constraint violation) | Phase 2 verification query catches this **before** making the column `not null`; fix data first, don't force the constraint. |
| Duplication detection / statistics silently wrong after cutover (raw SQL, not covered by JPA mapping) | `CustomerDuplicationService` and `StatisticsService` raw SQL are called out explicitly in Phase 3/4 — easy to miss since they don't go through the entity layer. |
| Frontend/backend DTO drift during the transition | Keep backend + frontend changes in the same PR/branch; this is a monorepo, no independent deployability constraint forces splitting them. |

## 7. Summary of renames

| Old | New |
|---|---|
| `customers` (table) | `households` |
| `customers.customer_id` | `households.household_id` |
| `customers_addpersons` (table) | merged into `persons`, with `is_main_person` distinguishing former `customers` rows |
| `customers_addpersons.customer_id` | `persons.household_id` |
| `customers_notes` (table) | `household_notes` |
| `customers_notes.customer_id` | `household_notes.household_id` |
| `distributions_customers` (table) | `distributions_households` |
| `distributions_customers.customer_id` | `distributions_households.household_id` |
| `CustomerEntity` | `HouseholdEntity` |
| `CustomerAddPersonEntity` (+ person fields of `CustomerEntity`) | `PersonEntity` |
| `CustomerRepository` | `HouseholdRepository` |
| `CustomerAddPersonRepository` | `PersonRepository` |
