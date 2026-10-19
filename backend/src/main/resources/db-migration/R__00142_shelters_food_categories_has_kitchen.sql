-- What a shelter usually needs (issue #3880), so whoever loads the goods - and the drivers on the
-- route - can see what fits:
--   has_kitchen         whether it can cook; null when nobody knows yet, which is not the same as "no"
--   accepts_everything  takes whatever there is, instead of every category being ticked one by one
--   has_freezer         can store frozen food
--   restrictions        what no category expresses, e.g. "kein Schweinefleisch", "keine Aufbackware"
--   fixed_quantities    standing amounts it gets every time, e.g. "4 Kisten Schnittbrot"
alter table shelters
    add column if not exists has_kitchen boolean;
-- a database that ran an earlier draft of this script has the column as `not null default false`
alter table shelters
    alter column has_kitchen drop not null;
alter table shelters
    alter column has_kitchen drop default;

alter table shelters
    add column if not exists accepts_everything boolean not null default false;
alter table shelters
    add column if not exists has_freezer boolean not null default false;
alter table shelters
    add column if not exists restrictions varchar(500);
alter table shelters
    add column if not exists fixed_quantities varchar(500);

-- Plain join tables without an entity of their own, so no id and no sequence: the food categories a
-- shelter asks for, and the ones it does not want. Food categories are only ever deactivated, never
-- deleted; the cascade just keeps a deletion from being blocked by these lists.
create table if not exists shelters_food_categories
(
    shelter_id       bigint not null references shelters (id) on delete cascade,
    food_category_id bigint not null references food_categories (id) on delete cascade,
    constraint shelters_food_categories_pk primary key (shelter_id, food_category_id)
);

create index if not exists shelters_food_categories_food_category_id_idx
    on shelters_food_categories (food_category_id);

create table if not exists shelters_excluded_food_categories
(
    shelter_id       bigint not null references shelters (id) on delete cascade,
    food_category_id bigint not null references food_categories (id) on delete cascade,
    constraint shelters_excluded_food_categories_pk primary key (shelter_id, food_category_id)
);

create index if not exists shelters_excluded_food_categories_food_category_id_idx
    on shelters_excluded_food_categories (food_category_id);
