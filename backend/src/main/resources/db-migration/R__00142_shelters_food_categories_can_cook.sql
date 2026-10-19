-- What a shelter usually needs (issue #3880): the food categories it asks for, and whether it has a
-- kitchen - a shelter that cannot cook has no use for food that still has to be prepared.
alter table shelters
    add column if not exists can_cook boolean not null default false;

-- A plain join table without an entity of its own, so no id and no sequence. Food categories are only
-- ever deactivated, never deleted; the cascade just keeps a deletion from being blocked by this list.
create table if not exists shelters_food_categories
(
    shelter_id       bigint not null references shelters (id) on delete cascade,
    food_category_id bigint not null references food_categories (id) on delete cascade,
    constraint shelters_food_categories_pk primary key (shelter_id, food_category_id)
);

create index if not exists shelters_food_categories_food_category_id_idx
    on shelters_food_categories (food_category_id);
