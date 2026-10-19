-- A driver confirming a delivery to one of the shelters picked for the route that day (issue #3880).
-- Per food collection (distribution + route) like the picks themselves, since a shelter is not a fixed
-- stop of the route but different from day to day. Counted into the route's progress next to the
-- ticked stops - in Routen-Navi and on the dashboard.
create table if not exists food_collections_shelter_deliveries
(
    id                   bigint    primary key,
    created_at           timestamptz not null,
    updated_at           timestamptz not null,
    created_by           bigint    null references users (id) on delete set null,
    updated_by           bigint    null references users (id) on delete set null,
    food_collection_id   bigint    not null references food_collections (id) on delete cascade,
    shelter_id           bigint    not null references shelters (id) on delete cascade,
    delivered_by_user_id bigint    null references users (id) on delete set null,
    constraint food_collections_shelter_deliveries_uq unique (food_collection_id, shelter_id)
);

-- event times are timestamptz (ADR-0054); a database that ran an earlier draft of this script has
-- them as plain timestamp, written as Europe/Vienna wall-clock time (ADR-0027). Only converted while
-- still naive - converting a timestamptz column again would shift its values on every re-run.
DO
$$
DECLARE
    column_name_to_convert text;
BEGIN
    FOREACH column_name_to_convert IN ARRAY ARRAY ['created_at', 'updated_at']
        LOOP
            IF EXISTS (SELECT 1
                       FROM information_schema.columns
                       WHERE table_name = 'food_collections_shelter_deliveries'
                         AND column_name = column_name_to_convert
                         AND data_type = 'timestamp without time zone') THEN
                EXECUTE format(
                        'alter table food_collections_shelter_deliveries alter column %I type timestamptz using %I at time zone ''Europe/Vienna''',
                        column_name_to_convert, column_name_to_convert);
            END IF;
        END LOOP;
END
$$;

create index if not exists food_collections_shelter_deliveries_shelter_id_idx
    on food_collections_shelter_deliveries (shelter_id);
create index if not exists food_collections_shelter_deliveries_delivered_by_user_id_idx
    on food_collections_shelter_deliveries (delivered_by_user_id);

-- Hibernate's id.db_structure_naming_strategy is "standard" in this app (see R__00070) - every
-- entity table needs its own "<table>_seq" sequence, incremented by 50 to match Hibernate's
-- default allocationSize.
create sequence if not exists food_collections_shelter_deliveries_seq
    start with 1
    increment by 50
    owned by food_collections_shelter_deliveries.id;

-- the dashboard's route progress counts these, so a delivery has to wake its SSE stream like a ticked
-- stop does (R__00097)
CREATE OR REPLACE TRIGGER trigger_dashboard_update_notification
    AFTER INSERT OR UPDATE OR DELETE
    ON food_collections_shelter_deliveries
    FOR EACH ROW
EXECUTE FUNCTION insert_dashboard_update_to_sse_outbox();
