-- Who made the latest change, next to the created_at/updated_at that already say when.
--
-- Filled by Spring Data JPA auditing (@CreatedBy/@LastModifiedBy on BaseChangeTrackingEntity, see
-- JpaAuditingConfig), so every table backed by that mapped superclass needs both columns. The value
-- is the username rather than a foreign key to users(id) on purpose: it has to stay readable after
-- the account is renamed or deleted, and an audit value that can be cascaded away is worthless.
--
-- Nullable throughout: rows that existed before this migration have no actor, and writes that no
-- user is behind (scheduled jobs, Flyway testdata, the initial-admin bootstrap) legitimately leave
-- them empty.
--
-- The audit_log table (R__00093) is the append-only history; these two columns only ever hold the
-- most recent actor per row, which is what answers "who last touched this household" without a join.

do
$$
    declare
        audited_table text;
    begin
        foreach audited_table in array array [
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
            'users_authorities'
            ]
            loop
                execute format('alter table if exists %I add if not exists created_by varchar(255)', audited_table);
                execute format('alter table if exists %I add if not exists updated_by varchar(255)', audited_table);
            end loop;
    end
$$;
