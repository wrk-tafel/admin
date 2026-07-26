-- Hibernate's "single" id.db_structure_naming_strategy makes every entity share one sequence
-- (hibernate_sequence). Switching to the new default ("standard") gives every entity table its
-- own sequence, named "<table>_seq". Each new sequence is seeded above the table's current max
-- id (with a safety gap) so it can never collide with rows already inserted through the old
-- shared sequence. Increment is 50 to match the JPA/Hibernate default allocationSize that
-- "standard" implies (Hibernate validates the two match, see MappingSettings#ID_DB_STRUCTURE_NAMING_STRATEGY).
DO
$$
    DECLARE
        tbl  text;
        max_id bigint;
    BEGIN
        FOR tbl IN SELECT unnest(ARRAY [
            'static_values',
            'static_countries',
            'login_attempts',
            'scanner_registrations',
            'users_authorities',
            'persons',
            'distributions_statistics_shelters',
            'users',
            'employees',
            'distributions',
            'households',
            'distributions_statistics',
            'cars',
            'household_notes',
            'distributions_households',
            'mail_recipients',
            'food_categories',
            'food_collections',
            'routes',
            'shelters',
            'routes_stops',
            'shelters_contacts',
            'shops',
            'sse_outbox'
            ])
            LOOP
                EXECUTE format('SELECT coalesce(max(id), 0) FROM %I', tbl) INTO max_id;
                EXECUTE format(
                        'CREATE SEQUENCE IF NOT EXISTS %I START WITH %s INCREMENT BY 50 OWNED BY %I.id',
                        tbl || '_seq', max_id + 1000, tbl
                        );
            END LOOP;
    END
$$;

-- hibernate_sequence is retired once every entity has its own sequence (see R__00059 for the
-- last remaining manual user, updated in lockstep with this migration).
drop sequence if exists hibernate_sequence;
