create table if not exists food_categories
(
    id         bigint primary key,
    created_at timestamp   not null,
    updated_at timestamp   not null,
    name       varchar(50) not null
);
