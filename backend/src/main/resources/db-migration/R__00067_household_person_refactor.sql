-- Splits the "customers" (household + main person conflated) / "customers_addpersons" (other
-- members) model into a proper households / persons model, with exactly one person per
-- household flagged as the main person. See HOUSEHOLD_PERSON_REFACTORING_PLAN.md.
--
-- Additive only: `customers` and `customers_addpersons` are read, never written or dropped here
-- (dropped later, in a separate cleanup migration, after a production observation window).
-- Every statement is guarded to be safely re-runnable after a partial failure.

-- households: the case record (was `customers`, minus the main person's personal fields)
create table if not exists households
(
    id                         bigint primary key,
    created_at                 timestamp    not null,
    updated_at                 timestamp    not null,
    household_id               bigint       not null,
    employee_id                bigint       null references employees (id),
    main_person_id             bigint       null,
    address_street             varchar(100) null,
    address_housenumber        varchar(10)  null,
    address_stairway           varchar(5)   null,
    address_postalcode         integer      null,
    address_door               varchar(10)  null,
    address_city               varchar(50)  null,
    telephone_number           varchar      null,
    email                      varchar(100) null,
    valid_until                date         not null,
    locked                     boolean      not null default false,
    locked_at                  timestamp    null,
    locked_by                  bigint       null references users (id) on delete set null,
    lock_reason                text         null,
    migrated                   boolean      not null default false,
    migration_date             timestamp    null,
    prolonged_at               timestamp    null,
    pending_cost_contribution  numeric      not null default 0
);

create unique index if not exists households_household_id_key on households (household_id);

-- persons: every household member, including the main person (was `customers` + `customers_addpersons`)
create table if not exists persons
(
    id                    bigint primary key,
    created_at            timestamp    not null,
    updated_at            timestamp    not null,
    household_id          bigint       not null references households (id) on delete cascade,
    is_main_person        boolean      not null default false,
    firstname             varchar(50)  null,
    lastname              varchar(50)  null,
    birth_date            date         null,
    gender                varchar(10)  null,
    country_id            bigint       not null references static_countries (id),
    employer              varchar(100) null,
    income                numeric      null,
    income_due            date         null,
    exclude_household     boolean      not null default false,
    receives_familybonus  boolean      not null default false
);

create unique index if not exists uq_persons_household_main
    on persons (household_id) where is_main_person = true;

create index if not exists idx_persons_household_id on persons (household_id);

-- 1) households <- customers (id preserved: households.id == old customers.id)
insert into households (id, created_at, updated_at, household_id, employee_id,
                         address_street, address_housenumber, address_stairway, address_postalcode,
                         address_door, address_city, telephone_number, email, valid_until, locked,
                         locked_at, locked_by, lock_reason, migrated, migration_date, prolonged_at,
                         pending_cost_contribution)
select c.id, c.created_at, c.updated_at, c.customer_id, c.employee_id,
       c.address_street, c.address_housenumber, c.address_stairway, c.address_postalcode,
       c.address_door, c.address_city, c.telephone_number, c.email, c.valid_until, c.locked,
       c.locked_at, c.locked_by, c.lock_reason, c.migrated, c.migration_date, c.prolonged_at,
       c.pending_cost_contribution
from customers c
where not exists (select 1 from households h where h.id = c.id);

-- 2) main person per household <- customers (id preserved: person.id == the household's own id;
--    safe because `customers.id` and `customers_addpersons.id` are both drawn from the single
--    shared `hibernate_sequence` and have never collided)
insert into persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname,
                      birth_date, gender, country_id, employer, income, income_due,
                      exclude_household, receives_familybonus)
select c.id, c.created_at, c.updated_at, c.id, true, c.firstname, c.lastname, c.birth_date,
       c.gender, c.country_id, c.employer, c.income, c.income_due, false, false
from customers c
where not exists (select 1 from persons p where p.id = c.id);

-- 3) additional persons <- customers_addpersons (id preserved)
insert into persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname,
                      birth_date, gender, country_id, employer, income, income_due,
                      exclude_household, receives_familybonus)
select cap.id, cap.created_at, cap.updated_at, cap.customer_id, false, cap.firstname, cap.lastname,
       cap.birth_date, cap.gender, cap.country_id, cap.employer, cap.income, cap.income_due,
       cap.exclude_household, cap.receives_familybonus
from customers_addpersons cap
where not exists (select 1 from persons p where p.id = cap.id);

-- 4) backfill households.main_person_id
update households h
set main_person_id = p.id
from persons p
where p.household_id = h.id
  and p.is_main_person = true
  and h.main_person_id is distinct from p.id;

do $$
declare
    missing_count bigint;
begin
    select count(*) into missing_count from households where main_person_id is null;
    if missing_count > 0 then
        raise exception 'household_person_refactor: % household(s) have no main person after backfill', missing_count;
    end if;
end $$;

-- `main_person_id` is intentionally left NULLABLE at the schema level (not NOT NULL): households
-- and persons have a mutual not-null FK requirement (household needs a main person, person needs
-- a household), which would otherwise make it impossible to ever INSERT a brand new household +
-- main person pair (neither row could be inserted first). The application enforces "exactly one
-- main person, eventually" by always creating a household with main_person_id = null, then
-- inserting its persons, then updating main_person_id in the same transaction — see
-- HouseholdService. The migrated rows above are backfilled and verified non-null immediately
-- (the exception above), but the column itself stays nullable for future household creation.
alter table households drop constraint if exists fk_households_main_person;
alter table households add constraint fk_households_main_person
    foreign key (main_person_id) references persons (id);

-- 5) redirect dependent tables from `customers` to `households` (metadata-only rename, no data
--    rewrite/loss: household ids are identical to the old customer ids for every row)
alter table if exists customers_notes rename to household_notes;

do $$
begin
    if exists (select 1 from information_schema.columns
               where table_name = 'household_notes' and column_name = 'customer_id') then
        alter table household_notes rename column customer_id to household_id;
    end if;
end $$;

alter table if exists household_notes drop constraint if exists customers_notes_customer_id_fkey;
alter table if exists household_notes drop constraint if exists fk_household_notes_household;
alter table if exists household_notes add constraint fk_household_notes_household
    foreign key (household_id) references households (id) on delete cascade;

alter table if exists distributions_customers rename to distributions_households;

do $$
begin
    if exists (select 1 from information_schema.columns
               where table_name = 'distributions_households' and column_name = 'customer_id') then
        alter table distributions_households rename column customer_id to household_id;
    end if;
end $$;

alter table if exists distributions_households drop constraint if exists distributions_customers_customer_id_fkey;
alter table if exists distributions_households drop constraint if exists distributions_customers_distribution_id_customer_id_key;
alter table if exists distributions_households drop constraint if exists fk_distributions_households_household;
alter table if exists distributions_households add constraint fk_distributions_households_household
    foreign key (household_id) references households (id) on delete cascade;
alter table if exists distributions_households drop constraint if exists uq_distributions_households_distribution_household;
alter table if exists distributions_households add constraint uq_distributions_households_distribution_household
    unique (distribution_id, household_id);

-- 6) duplication-detection indexes move to the person that carries the searchable name (the main
--    person, joined via households.main_person_id) — see CustomerDuplicationService rewrite.
create index if not exists soundex_persons_firstname on persons (soundex(firstname));
create index if not exists soundex_persons_lastname on persons (soundex(lastname));

-- 7) rename the business-id sequence to match (metadata-only, no gaps, no data change)
alter sequence if exists customer_id_sequence rename to household_id_sequence;
