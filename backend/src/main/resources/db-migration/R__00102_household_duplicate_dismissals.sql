-- A reviewer's "kein Duplikat" decision on the /kunden/duplikate screen: a specific pair of
-- households that HouseholdDuplicationService's fuzzy matcher flagged as a possible duplicate but
-- a human judged not to be one. household_id_low/high store the business household_id (the number
-- shown throughout the UI, HouseholdEntity.householdId), always with household_id_low < household_id_high
-- so a pair has exactly one row regardless of which household the reviewer dismissed it from -
-- matching the anchor ordering HouseholdDuplicationService's self-join already relies on.
--
-- Deliberately no foreign key: household_id values are never reused once assigned, so a dismissal
-- surviving a household's deletion is inert (it can never match a pair again), not a dangling
-- reference to clean up.
create table if not exists household_duplicate_dismissals
(
    id                 bigint    primary key,
    created_at         timestamp not null,
    updated_at         timestamp not null,
    created_by         varchar(255),
    updated_by         varchar(255),
    household_id_low   bigint    not null,
    household_id_high  bigint    not null,
    unique (household_id_low, household_id_high)
);

create sequence if not exists household_duplicate_dismissals_seq
    start with 1 increment by 50 owned by household_duplicate_dismissals.id;
