-- `food_collections.route_id` and `food_collections_items.shop_id`/`food_category_id` used to be
-- the only stored reference, with the route's name, the shop's number and the category's name read
-- live off `routes`/`shops`/`food_categories` on every export. Renaming any of those retroactively
-- rewrote the TOeT_Spenden export for distributions that already happened, the same problem
-- R__00086 fixed for the weight itself. The name/number is now snapshotted once, when the row is
-- recorded, alongside the existing FK (kept for the amount/weight lookups, which are unaffected by
-- a rename since they match by id).
alter table if exists food_collections
    add column if not exists route_name varchar(50);

-- Existing rows can only be backfilled from today's master data - that is exactly the value they
-- resolved to before this column existed, so the backfill changes no reported output.
update food_collections fc
set route_name = r.name
from routes r
where r.id = fc.route_id
  and fc.route_name is null;

alter table if exists food_collections
    alter column route_name set not null;

alter table if exists food_collections_items
    add column if not exists shop_number integer,
    add column if not exists category_name varchar(50);

update food_collections_items i
set shop_number   = s.number,
    category_name = c.name
from shops s,
     food_categories c
where s.id = i.shop_id
  and c.id = i.food_category_id
  and (i.shop_number is null or i.category_name is null);

alter table if exists food_collections_items
    alter column shop_number set not null,
    alter column category_name set not null;
