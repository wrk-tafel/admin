-- A goodwill package ("Kulanzpaket"): a ticket handed to someone who is not (yet) a registered household,
-- e.g. a newcomer who did not bring the documents for the registration. It gets a ticket number like any
-- household, so it is called on the ticket monitor and listed on the Kundenliste, but it belongs to no
-- household - it only records how many persons (and infants) it is for.
alter table distributions_households
    alter column household_id drop not null;

alter table distributions_households
    add column if not exists goodwill boolean not null default false;

alter table distributions_households
    add column if not exists goodwill_person_count integer;

alter table distributions_households
    add column if not exists goodwill_infant_count integer;

alter table distributions_households
    drop constraint if exists ck_distributions_households_goodwill;

alter table distributions_households
    add constraint ck_distributions_households_goodwill check (
        (goodwill = false and household_id is not null and goodwill_person_count is null and goodwill_infant_count is null)
        or
        (goodwill = true and household_id is null and goodwill_person_count >= 1
            and goodwill_infant_count >= 0 and goodwill_infant_count <= goodwill_person_count)
    );

alter table distributions_statistics
    add column if not exists count_goodwill_packages integer not null default 0;

alter table distributions_statistics
    add column if not exists count_goodwill_persons integer not null default 0;
