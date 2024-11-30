create table if not exists food_collections
(
    id                    bigint primary key,
    created_at            timestamp   not null,
    updated_at            timestamp   not null,
    distribution_id       bigint      not null REFERENCES distributions (id),
    route_id              bigint      not null REFERENCES routes (id),
    car_license_plate     varchar(20) not null,
    driver_employee_id    bigint      null references employees (id),
    co_driver_employee_id bigint      null references employees (id),
    km_start              integer     not null,
    km_end                integer     not null
);

create table if not exists food_collections_items
(
    food_collection_id bigint  not null REFERENCES food_collections (id) ON DELETE CASCADE,
    shop_id            bigint  not null REFERENCES shops (id),
    food_category_id   bigint  not null REFERENCES food_categories (id),
    amount             integer not null
);

alter table if exists food_collections
    add constraint food_collections_uk
        unique (distribution_id, route_id);

alter table if exists food_collections_items
    add constraint food_collections_items_pk
        unique (food_category_id, shop_id, food_collection_id);
