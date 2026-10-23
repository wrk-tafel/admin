-- What a shelter usually needs (issue #3880), so whoever loads the goods - and the drivers on the
-- route - can see what fits:
--   has_kitchen       whether it can cook; null when nobody knows yet, which is not the same as "no"
--   has_freezer       can store frozen food
--   restrictions      what no category expresses, e.g. "kein Schweinefleisch", "keine Aufbackware"
-- plus, in tables of their own, the food categories it needs, those it does not want, and the fixed
-- amounts it gets every time. A shelter that takes everything simply has every category selected.
alter table shelters
    add column if not exists has_kitchen boolean;
-- a database that ran an earlier draft of this script has the column as `not null default false`
alter table shelters
    alter column has_kitchen drop not null;
alter table shelters
    alter column has_kitchen drop default;

alter table shelters
    add column if not exists has_freezer boolean not null default false;
alter table shelters
    add column if not exists restrictions varchar(500);
-- a database that ran an earlier draft of this script has these as plain columns - "takes
-- everything" is all categories selected, and the fixed amounts are structured below
alter table shelters
    drop column if exists accepts_everything;
alter table shelters
    drop column if exists fixed_quantities;

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

-- The fixed amounts a shelter gets every time - in whole boxes of one food category, with an optional
-- note to tell them apart (e.g. "Schnittbrot" for bread). Structured rather than free text so a
-- calculation can take them into account.
create table if not exists shelters_fixed_quantities
(
    shelter_id       bigint       not null references shelters (id) on delete cascade,
    food_category_id bigint       not null references food_categories (id) on delete cascade,
    amount           integer      not null,
    note             varchar(100) null,
    constraint shelters_fixed_quantities_amount_positive check (amount > 0)
);

create index if not exists shelters_fixed_quantities_shelter_id_idx
    on shelters_fixed_quantities (shelter_id);
create index if not exists shelters_fixed_quantities_food_category_id_idx
    on shelters_fixed_quantities (food_category_id);
