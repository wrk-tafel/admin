alter table cars
    add enabled boolean default true not null;

alter table if exists cars
    add if not exists sort_order integer default 0 not null;

update cars c
set sort_order = renumbered.new_sort_order
from (
    select id, row_number() over (order by name) as new_sort_order
    from cars
) renumbered
where c.id = renumbered.id;
