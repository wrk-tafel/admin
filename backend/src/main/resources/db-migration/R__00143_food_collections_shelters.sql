-- The shelters a route delivers to on one distribution day (issue #3880), picked in the food collection
-- recording ("Warenerfassung") and shown to the driver in the route guidance ("Routen-Navi"). Per food
-- collection rather than per route, since where the goods go changes from day to day. A plain join
-- table without an entity of its own, so no id and no sequence.
create table if not exists food_collections_shelters
(
    food_collection_id bigint not null references food_collections (id) on delete cascade,
    shelter_id         bigint not null references shelters (id) on delete cascade,
    constraint food_collections_shelters_pk primary key (food_collection_id, shelter_id)
);

create index if not exists food_collections_shelters_shelter_id_idx
    on food_collections_shelters (shelter_id);

-- the dashboard's statistics card shows these shelters, so a change has to reach it live like a
-- change to food_collections itself does (R__00059) - picking shelters touches only this table
CREATE OR REPLACE TRIGGER trigger_dashboard_update_notification
    AFTER INSERT OR UPDATE OR DELETE
    ON food_collections_shelters
    FOR EACH ROW
EXECUTE FUNCTION insert_dashboard_update_to_sse_outbox();
