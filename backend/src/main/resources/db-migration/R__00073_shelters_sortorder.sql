alter table if exists shelters
    add if not exists sort_order integer default 0 not null;

-- Backfills sort_order from the shelters' current de-facto order (alphabetical by name,
-- what getActiveShelters()/getAllShelters() sort by today) so existing display order is
-- preserved until someone drags a row. Idempotent: re-running is a no-op once consecutive.
update shelters s
set sort_order = renumbered.new_sort_order
from (
    select id, row_number() over (order by name) as new_sort_order
    from shelters
) renumbered
where s.id = renumbered.id;
