alter table if exists food_categories
    add if not exists sort_order integer default 0 not null;
