-- Only `amount` used to be stored, with the kg derived at read time from the shop's current
-- `food_unit` and the category's current `weight_per_unit`. Editing either in the settings screen
-- therefore rewrote history: `distributions_statistics.food_total_amount` is frozen when a
-- distribution closes, while the TOeT_Spenden export re-derived the same distributions' weights on
-- every run, so the two drifted apart after any master-data edit. The weight is now computed once,
-- when the item is saved, and stored alongside the amount.
alter table if exists food_collections_items
    add column if not exists weight decimal;

-- Existing rows can only be backfilled from today's master data - that is exactly the value they
-- resolved to before this column existed, so the backfill changes no reported number.
update food_collections_items i
set weight = case
                 when s.food_unit = 'KG' then i.amount
                 else i.amount * coalesce(c.weight_per_unit, 0)
    end
from shops s,
     food_categories c
where s.id = i.shop_id
  and c.id = i.food_category_id
  and i.weight is null;

alter table if exists food_collections_items
    alter column weight set not null;
