-- Renumbers food_categories.sort_order to consecutive integers (1, 2, 3, ...) within each
-- return_item group, preserving today's relative order (return_item, then sort_order, then
-- name - the same ordering FoodCategoryService.sortCategories() uses). Existing values are not
-- contiguous (e.g. many rows share sort_order = 1000). Idempotent: re-running is a no-op once
-- values are already consecutive per group.
update food_categories fc
set sort_order = renumbered.new_sort_order
from (
    select id,
           row_number() over (partition by return_item order by sort_order, name) as new_sort_order
    from food_categories
) renumbered
where fc.id = renumbered.id;
