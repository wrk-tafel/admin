-- A return box stays on a route's list until it has actually gone back to its shop: returned_at is
-- when someone confirmed that, null while it is still waiting. Boxes recorded before this column
-- existed were only ever shown for a route's latest trip, so every older row counts as settled and
-- only each route's newest collection carries over as outstanding.
do
$$
    begin
        if not exists (select 1
                       from information_schema.columns
                       where table_schema = current_schema()
                         and table_name = 'food_collections_return_items'
                         and column_name = 'returned_at') then

            alter table food_collections_return_items
                add column returned_at timestamp,
                add column returned_by varchar(255);

            update food_collections_return_items r
            set returned_at = (select fc.created_at from food_collections fc where fc.id = r.food_collection_id)
            where r.food_collection_id not in (select distinct on (fc.route_id) fc.id
                                               from food_collections fc
                                                        join distributions d on d.id = fc.distribution_id
                                               order by fc.route_id, d.started_at desc, fc.id desc);
        end if;
    end
$$;

create index if not exists food_collections_return_items_outstanding_idx
    on food_collections_return_items (food_collection_id)
    where returned_at is null;
