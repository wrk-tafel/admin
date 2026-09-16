-- household_duplicate_name_key(text, text) (R__00118) sorts a name's words into a canonical order,
-- but its body is a SELECT over unnest()/string_agg() - Postgres cannot inline that into the calling
-- query the way it inlines a plain expression, so every invocation pays the cost of spinning up a
-- separate query executor. HouseholdDuplicationService's self-join evaluates it against every
-- household pair, which is cheap for a handful of test households but turned the `/kunden/duplikate`
-- page into a several-second load once run against production's full household count.
--
-- persons.duplicate_name_key persists the result instead, computed once per write by a trigger -
-- the same pattern as the search_text columns in R__00088 - so a read only ever calls the cheap
-- builtin soundex()/levenshtein() against an already-computed value instead of the expensive
-- function. household_duplicate_name_key itself is unchanged and still used for the literal
-- in-flight value in HouseholdDuplicationService.findPotentialDuplicates, where it runs once per
-- call rather than once per household pair.
alter table persons
    add column if not exists duplicate_name_key text;

update persons
set duplicate_name_key = household_duplicate_name_key(firstname, lastname)
where duplicate_name_key is null;

create or replace function persons_refresh_duplicate_name_key() returns trigger
    language plpgsql as
$$
begin
    new.duplicate_name_key := household_duplicate_name_key(new.firstname, new.lastname);
    return new;
end;
$$;

drop trigger if exists persons_duplicate_name_key_trigger on persons;
create trigger persons_duplicate_name_key_trigger
    before insert or update
    on persons
    for each row
execute function persons_refresh_duplicate_name_key();

drop index if exists idx_persons_duplicate_name_key;
create index if not exists idx_persons_duplicate_name_key on persons (soundex(duplicate_name_key));
