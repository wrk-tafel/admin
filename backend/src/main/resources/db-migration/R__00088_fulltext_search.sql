-- Trigram-based fuzzy search for households and users.
--
-- Both tables carry a denormalized, lower-cased `search_text` holding everything the single search
-- box may match on. It is kept up to date by triggers rather than by the application, because the
-- searchable data is spread across parent/child tables (a household's members live in `persons`, a
-- user's name lives in `employees`) and every write path - REST, merges, testdata, manual fixes -
-- has to keep it correct, not just the ones going through HouseholdService/TafelUserDetailsManager.
--
-- One GIN trigram index per table then serves both match modes the backend issues:
-- `search_text like '%term%'` (substring, the exact hit) and
-- `strict_word_similarity(term, search_text)` (typo tolerance) - see SearchTextSpecs for why that
-- particular similarity function.

create extension if not exists pg_trgm;

-- households ------------------------------------------------------------------------------------

alter table households
    add column if not exists search_text text;

-- Value-taking variant: what the `households` row trigger needs, since on INSERT the new row is not
-- visible to a query yet and on UPDATE the table still holds the old values.
create or replace function household_search_text(
    p_id bigint,
    p_household_id bigint,
    p_street text,
    p_housenumber text,
    p_stairway text,
    p_door text,
    p_postalcode integer,
    p_city text,
    p_telephone text,
    p_email text
) returns text
    language sql
    stable as
$$
select lower(concat_ws(' ',
                       p_household_id::text,
                       (select string_agg(concat_ws(' ', p.firstname, p.lastname), ' ' order by p.id)
                        from persons p
                        where p.household_id = p_id),
                       p_street, p_housenumber, p_stairway, p_door, p_postalcode::text, p_city,
                       p_telephone, p_email));
$$;

-- Id-taking variant: for callers that read an already-stored household (persons trigger, backfill).
create or replace function household_search_text(p_id bigint) returns text
    language sql
    stable as
$$
select household_search_text(h.id, h.household_id, h.address_street, h.address_housenumber,
                             h.address_stairway, h.address_door, h.address_postalcode,
                             h.address_city, h.telephone_number, h.email)
from households h
where h.id = p_id;
$$;

create or replace function households_refresh_search_text() returns trigger
    language plpgsql as
$$
begin
    new.search_text := household_search_text(new.id, new.household_id, new.address_street,
                                             new.address_housenumber, new.address_stairway,
                                             new.address_door, new.address_postalcode,
                                             new.address_city, new.telephone_number, new.email);
    return new;
end;
$$;

drop trigger if exists households_search_text_trigger on households;
create trigger households_search_text_trigger
    before insert or update
    on households
    for each row
execute function households_refresh_search_text();

-- A person carries the names, so any insert/update/delete changes its household's search text.
-- Re-parenting a person (household merge) has to refresh both the old and the new household.
create or replace function persons_refresh_household_search_text() returns trigger
    language plpgsql as
$$
begin
    if tg_op <> 'INSERT' then
        update households set search_text = household_search_text(id) where id = old.household_id;
    end if;

    if tg_op <> 'DELETE' then
        update households set search_text = household_search_text(id) where id = new.household_id;
        return new;
    end if;

    return old;
end;
$$;

drop trigger if exists persons_search_text_trigger on persons;
create trigger persons_search_text_trigger
    after insert or update or delete
    on persons
    for each row
execute function persons_refresh_household_search_text();

create index if not exists households_search_text_idx on households using gin (search_text gin_trgm_ops);

-- users -----------------------------------------------------------------------------------------

alter table users
    add column if not exists search_text text;

create or replace function user_search_text(p_username text, p_employee_id bigint) returns text
    language sql
    stable as
$$
select lower(concat_ws(' ', p_username, e.personnel_number, e.firstname, e.lastname))
from employees e
where e.id = p_employee_id;
$$;

create or replace function users_refresh_search_text() returns trigger
    language plpgsql as
$$
begin
    new.search_text := user_search_text(new.username, new.employee_id);
    return new;
end;
$$;

drop trigger if exists users_search_text_trigger on users;
create trigger users_search_text_trigger
    before insert or update
    on users
    for each row
execute function users_refresh_search_text();

create or replace function employees_refresh_user_search_text() returns trigger
    language plpgsql as
$$
begin
    update users
    set search_text = user_search_text(username, employee_id)
    where employee_id = new.id;
    return new;
end;
$$;

drop trigger if exists employees_search_text_trigger on employees;
create trigger employees_search_text_trigger
    after insert or update
    on employees
    for each row
execute function employees_refresh_user_search_text();

create index if not exists users_search_text_idx on users using gin (search_text gin_trgm_ops);

-- backfill --------------------------------------------------------------------------------------
-- Guarded by `is distinct from` so re-running this migration after an unrelated edit rewrites only
-- the rows whose search text actually changed.

update households h
set search_text = household_search_text(h.id)
where h.search_text is distinct from household_search_text(h.id);

update users u
set search_text = user_search_text(u.username, u.employee_id)
where u.search_text is distinct from user_search_text(u.username, u.employee_id);
