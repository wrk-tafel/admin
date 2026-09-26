-- Users and employees are two separate records with no link between them.
--
-- A user is a login account and now carries its own personnel number, first and last name. An
-- employee is a person referenced by a food collection as its driver or co-driver, and is managed on
-- its own. Everything that used to reach the acting person through users.employee_id - the issuer of
-- a household, the author of a household note, the person who ticked off a route stop - now points at
-- the user directly, with the same on-delete-set-null behavior the employee reference had: deleting
-- the account clears the reference and the screens show "Mitarbeiter gelöscht".
--
-- Everything is guarded so the script also succeeds when Flyway re-runs it against a database that
-- already reflects it (see README.md in this directory).
--
-- A household issuer, note author or route stop completion whose employee has no user account
-- cannot be carried over - there is no account to point at - and stays empty afterwards.

alter table users
    add column if not exists personnel_number varchar(50);
alter table users
    add column if not exists firstname varchar(50);
alter table users
    add column if not exists lastname varchar(50);

alter table households
    add column if not exists issuer_user_id bigint references users (id) on delete set null;
alter table household_notes
    add column if not exists author_user_id bigint references users (id) on delete set null;
alter table routes_stops_completions
    add column if not exists completed_by_user_id bigint references users (id) on delete set null;

create index if not exists households_issuer_user_id_idx on households (issuer_user_id);
create index if not exists household_notes_author_user_id_idx on household_notes (author_user_id);
create index if not exists routes_stops_completions_completed_by_user_id_idx on routes_stops_completions (completed_by_user_id);

-- carry the data over while users.employee_id still exists ---------------------------------------

do
$$
    begin
        if exists (select 1
                   from information_schema.columns
                   where table_schema = current_schema()
                     and table_name = 'users'
                     and column_name = 'employee_id') then
            update users u
            set personnel_number = e.personnel_number,
                firstname        = e.firstname,
                lastname         = e.lastname
            from employees e
            where e.id = u.employee_id;

            -- min(): users.employee_id was never unique in the schema, so an employee shared by two
            -- accounts is attributed to the older one rather than failing the migration
            if exists (select 1
                       from information_schema.columns
                       where table_schema = current_schema()
                         and table_name = 'households'
                         and column_name = 'employee_id') then
                update households h
                set issuer_user_id = (select min(u.id) from users u where u.employee_id = h.employee_id)
                where h.employee_id is not null;
            end if;

            if exists (select 1
                       from information_schema.columns
                       where table_schema = current_schema()
                         and table_name = 'household_notes'
                         and column_name = 'employee_id') then
                update household_notes n
                set author_user_id = (select min(u.id) from users u where u.employee_id = n.employee_id)
                where n.employee_id is not null;
            end if;

            if exists (select 1
                       from information_schema.columns
                       where table_schema = current_schema()
                         and table_name = 'routes_stops_completions'
                         and column_name = 'employee_id') then
                update routes_stops_completions c
                set completed_by_user_id = (select min(u.id) from users u where u.employee_id = c.employee_id)
                where c.employee_id is not null;
            end if;
        end if;
    end
$$;

alter table users
    alter column personnel_number set not null;
alter table users
    alter column firstname set not null;
alter table users
    alter column lastname set not null;

-- the search text no longer depends on the employees table -----------------------------------------
-- (see R__00088_fulltext_search.sql for the original; the search box matches the same fields as before)

create or replace function user_search_text(p_username text, p_personnel_number text, p_firstname text,
                                            p_lastname text) returns text
    language sql
    immutable as
$$
select lower(concat_ws(' ', p_username, p_personnel_number, p_firstname, p_lastname));
$$;

create or replace function users_refresh_search_text() returns trigger
    language plpgsql as
$$
begin
    new.search_text := user_search_text(new.username, new.personnel_number, new.firstname, new.lastname);
    return new;
end;
$$;

drop trigger if exists employees_search_text_trigger on employees;
drop function if exists employees_refresh_user_search_text();
drop function if exists user_search_text(text, bigint);

update users u
set search_text = user_search_text(u.username, u.personnel_number, u.firstname, u.lastname)
where u.search_text is distinct from user_search_text(u.username, u.personnel_number, u.firstname, u.lastname);

-- drop the links ------------------------------------------------------------------------------------

alter table users
    drop column if exists employee_id;
alter table households
    drop column if exists employee_id;
alter table household_notes
    drop column if exists employee_id;
alter table routes_stops_completions
    drop column if exists employee_id;
