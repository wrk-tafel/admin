-- Accent-insensitive search, and the same search for employees (ADR-0071, extending ADR-0025).
--
-- search_text was only lower-cased, so "Ozturk" never found "Öztürk" and "Weiss" never found "Weiß".
-- It is now *folded* instead: lower-cased and stripped of diacritics by unaccent ("ß" becomes "ss",
-- "ı" becomes "i", "Ł" becomes "L", ...). The search term is folded by the very same function
-- (SearchTermNormalizer asks the database), so stored text and term can never disagree.
--
-- fold_search_text is STABLE, like unaccent() itself: its result depends on the unaccent dictionary,
-- so IMMUTABLE would be a promise it cannot keep. Nothing needs more - it only runs inside the
-- triggers that write search_text and once per search for the typed term, and the GIN indexes sit on
-- the stored column, not on an expression. unaccent runs before lower() so that a capital letter
-- with a diacritic (e.g. "İ") is stripped before it is lower-cased.
--
-- While a new release deploys, the previous one keeps running against these triggers for about half
-- a minute (ADR-0069). It never writes search_text itself and only reads it through the same
-- like/similarity queries, so it simply gets the folded values too.

create extension if not exists unaccent;

create or replace function fold_search_text(p_text text) returns text
    language sql
    stable
    parallel safe as
$$
select lower(unaccent('unaccent'::regdictionary, p_text));
$$;

-- households ------------------------------------------------------------------------------------
-- Same fields as before, plus each person's birth date (as dd.MM.yyyy, how staff type it) and
-- employer.

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
select fold_search_text(concat_ws(' ',
                                  p_household_id::text,
                                  (select string_agg(concat_ws(' ', p.firstname, p.lastname,
                                                               to_char(p.birth_date, 'DD.MM.YYYY'),
                                                               p.employer), ' ' order by p.id)
                                   from persons p
                                   where p.household_id = p_id),
                                  p_street, p_housenumber, p_stairway, p_door, p_postalcode::text, p_city,
                                  p_telephone, p_email));
$$;

-- users -----------------------------------------------------------------------------------------
-- Same fields as before, plus the e-mail address.

create or replace function user_search_text(p_username text, p_personnel_number text, p_firstname text,
                                            p_lastname text, p_email text) returns text
    language sql
    stable as
$$
select fold_search_text(concat_ws(' ', p_username, p_personnel_number, p_firstname, p_lastname, p_email));
$$;

create or replace function users_refresh_search_text() returns trigger
    language plpgsql as
$$
begin
    new.search_text := user_search_text(new.username, new.personnel_number, new.firstname, new.lastname,
                                        new.email);
    return new;
end;
$$;

drop function if exists user_search_text(text, text, text, text);

-- employees -------------------------------------------------------------------------------------

alter table employees
    add column if not exists search_text text;

create or replace function employee_search_text(p_personnel_number text, p_firstname text,
                                                p_lastname text) returns text
    language sql
    stable as
$$
select fold_search_text(concat_ws(' ', p_personnel_number, p_firstname, p_lastname));
$$;

create or replace function employees_refresh_search_text() returns trigger
    language plpgsql as
$$
begin
    new.search_text := employee_search_text(new.personnel_number, new.firstname, new.lastname);
    return new;
end;
$$;

drop trigger if exists employees_search_text_trigger on employees;
create trigger employees_search_text_trigger
    before insert or update
    on employees
    for each row
execute function employees_refresh_search_text();

create index if not exists employees_search_text_idx on employees using gin (search_text gin_trgm_ops);

-- backfill --------------------------------------------------------------------------------------
-- Guarded by `is distinct from` so a re-run rewrites only the rows whose search text actually
-- changed. The households' update is the expensive one: it rewrites every household once.

update households h
set search_text = household_search_text(h.id)
where h.search_text is distinct from household_search_text(h.id);

update users u
set search_text = user_search_text(u.username, u.personnel_number, u.firstname, u.lastname, u.email)
where u.search_text is distinct from user_search_text(u.username, u.personnel_number, u.firstname, u.lastname, u.email);

update employees e
set search_text = employee_search_text(e.personnel_number, e.firstname, e.lastname)
where e.search_text is distinct from employee_search_text(e.personnel_number, e.firstname, e.lastname);
