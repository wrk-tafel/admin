-- Cleanup migration for the households/persons refactor (see
-- HOUSEHOLD_PERSON_REFACTORING_PLAN.md, Phase 8 step 6, and R__00067).
--
-- customers/customers_addpersons were kept read-only/unused after R__00067 migrated their data
-- into households/persons, specifically so production could run on the new tables for a 1-2 week
-- observation window before this drop. DO NOT MERGE/DEPLOY THIS FILE until that observation
-- window has passed and the Phase 2 verification queries have been re-checked against production.
--
-- Safe to drop without cascade: no DB-level FK references either table any more -
-- customers_notes/distributions_customers were renamed and redirected to households in R__00067
-- (rename table + rename column + drop/add constraint), and customers_addpersons.customer_id was
-- never an enforced FK to begin with (see R__00004_customer_tables.sql). The indexes added in
-- R__00066 (idx_customers_valid_until, idx_customers_addpersons_customer_id) live on these tables
-- and are dropped automatically along with them.
--
-- Guarded so a partial failure (or an unexpectedly-stale households/persons copy) can't silently
-- destroy data: aborts instead of dropping if either table is missing rows that were never
-- carried over, or if the tables are already gone (nothing left to verify, nothing to drop).
do $$
declare
    missing_households bigint;
    missing_persons bigint;
begin
    if not exists (select 1 from information_schema.tables where table_name = 'customers')
        and not exists (select 1 from information_schema.tables where table_name = 'customers_addpersons') then
        return;
    end if;

    select count(*) into missing_households
    from customers c
    where not exists (select 1 from households h where h.id = c.id);

    if missing_households > 0 then
        raise exception 'household_person_cleanup: % row(s) in customers have no matching households row, aborting drop', missing_households;
    end if;

    select count(*) into missing_persons
    from customers c
    where not exists (select 1 from persons p where p.id = c.id and p.is_main_person = true);

    if missing_persons > 0 then
        raise exception 'household_person_cleanup: % row(s) in customers have no matching main person in persons, aborting drop', missing_persons;
    end if;

    select count(*) into missing_persons
    from customers_addpersons cap
    where not exists (select 1 from persons p where p.id = cap.id);

    if missing_persons > 0 then
        raise exception 'household_person_cleanup: % row(s) in customers_addpersons have no matching persons row, aborting drop', missing_persons;
    end if;
end $$;

drop table if exists customers_addpersons;
drop table if exists customers;
