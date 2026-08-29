-- Issue #3426: created_by/updated_by (R__00092/R__00096/R__00102) store the acting user's username
-- as plain text with no foreign key to users(id), on purpose - the value had to stay readable after
-- that account was renamed or deleted (see R__00092's own comment and ADR-0039). In practice that
-- meant a deleted account's username stayed in the database forever on a table with no retention of
-- its own (shops, cars, routes, distributions, ...), since nothing ever cleared it.
--
-- Both columns become a nullable foreign key to users(id) with `on delete set null` instead -
-- mirroring R__00106's employee_id pattern - so a deleted account's provenance is cleared by the
-- database itself, the same moment the account row goes, instead of a bespoke sweep having to keep
-- this table list in sync by hand (ChangeTrackingActorAnonymizationService, removed by this change).
-- See ADR-0052.
--
-- Backfill: a stored username that still matches an existing users.username becomes that user's id;
-- one that no longer matches anything (a since-renamed or since-deleted account) becomes NULL, which
-- is the correct end state for a deleted account's provenance anyway.

do
$$
    declare
        audited_table text;
    begin
        foreach audited_table in array array [
            -- R__00092_change_tracking_actor.sql
            'cars',
            'distributions',
            'distributions_households',
            'distributions_statistics',
            'distributions_statistics_shelters',
            'employees',
            'food_categories',
            'food_collections',
            'food_return_categories',
            'household_documents',
            'household_notes',
            'households',
            'login_attempts',
            'persons',
            'push_preferences',
            'push_subscriptions',
            'push_type_preferences',
            'routes',
            'routes_stops',
            'shelters',
            'shelters_contacts',
            'shops',
            'users',
            'users_authorities',
            -- R__00096_route_stop_completions.sql
            'routes_stops_completions',
            -- R__00102_household_duplicate_dismissals.sql
            'household_duplicate_dismissals'
            ]
            loop
                execute format('alter table if exists %I add column if not exists created_by_id bigint', audited_table);
                execute format(
                    'update %I t set created_by_id = u.id from users u where t.created_by = u.username',
                    audited_table
                );
                execute format('alter table if exists %I drop column if exists created_by', audited_table);
                execute format('alter table if exists %I rename column created_by_id to created_by', audited_table);
                execute format(
                    'alter table if exists %I add foreign key (created_by) references users (id) on delete set null',
                    audited_table
                );

                execute format('alter table if exists %I add column if not exists updated_by_id bigint', audited_table);
                execute format(
                    'update %I t set updated_by_id = u.id from users u where t.updated_by = u.username',
                    audited_table
                );
                execute format('alter table if exists %I drop column if exists updated_by', audited_table);
                execute format('alter table if exists %I rename column updated_by_id to updated_by', audited_table);
                execute format(
                    'alter table if exists %I add foreign key (updated_by) references users (id) on delete set null',
                    audited_table
                );
            end loop;
    end
$$;
