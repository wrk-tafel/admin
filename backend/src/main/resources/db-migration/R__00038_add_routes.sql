create table if not exists routes
(
    id         bigint primary key,
    created_at timestamp   not null,
    updated_at timestamp   not null,
    number     decimal     not null,
    name       varchar(50) not null,
    note       text
);

create table if not exists routes_stops
(
    id          bigint primary key,
    created_at  timestamp not null,
    updated_at  timestamp not null,
    route_id    bigint    not null REFERENCES routes (id),
    shop_id     bigint    null REFERENCES shops (id),
    description text      null,
    time        time      not null,
    UNIQUE (route_id, shop_id),
    UNIQUE (route_id, time)
);
