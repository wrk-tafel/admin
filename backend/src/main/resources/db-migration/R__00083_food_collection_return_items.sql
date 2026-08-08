create table if not exists food_collections_return_items
(
    food_collection_id bigint       not null references food_collections (id) on delete cascade,
    shop_id            bigint       not null references shops (id),
    description        varchar(100) not null,
    amount             integer      not null
);

create index if not exists food_collections_return_items_idx
    on food_collections_return_items (food_collection_id, shop_id);

-- Return boxes are recorded by free-text description now, so the rows that were stored as regular
-- food-collection items of a return-flagged category move over, keyed by the category's name.
-- Guarded on the column still existing because R__00084 moves those categories to their own table
-- and drops `food_categories.return_item` - this script has to stay re-runnable afterwards.
do
$$
    begin
        if exists (select 1
                   from information_schema.columns
                   where table_schema = current_schema()
                     and table_name = 'food_categories'
                     and column_name = 'return_item') then

            insert into food_collections_return_items (food_collection_id, shop_id, description, amount)
            select i.food_collection_id, i.shop_id, c.name, i.amount
            from food_collections_items i
                     join food_categories c on c.id = i.food_category_id
            where c.return_item = true
              and i.amount > 0
              and not exists (select 1
                              from food_collections_return_items r
                              where r.food_collection_id = i.food_collection_id
                                and r.shop_id = i.shop_id
                                and r.description = c.name);

            delete
            from food_collections_items i using food_categories c
            where c.id = i.food_category_id
              and c.return_item = true;
        end if;
    end
$$;
