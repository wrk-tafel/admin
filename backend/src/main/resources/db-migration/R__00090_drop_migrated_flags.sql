-- Drops the `migrated` / `migration_date` bookkeeping columns added by R__00020 for the 2023 data
-- import (`users`) and carried over to `households` by the household/person refactor (R__00067).
--
-- They only ever recorded which rows still held untouched imported data. The imported households
-- have been cleaned up (issue #2851: the addresses those rows crammed into `address_street` were
-- split into `address_housenumber` / `address_stairway` / `address_door`), so there is nothing left
-- for the flag to mark. `users.migrated` / `users.migration_date` were never mapped by an entity at
-- all and no code ever read either column.
--
-- Guarded with `if exists` so the script stays repeatable.

alter table if exists households
    drop column if exists migrated;
alter table if exists households
    drop column if exists migration_date;

alter table if exists users
    drop column if exists migrated;
alter table if exists users
    drop column if exists migration_date;
