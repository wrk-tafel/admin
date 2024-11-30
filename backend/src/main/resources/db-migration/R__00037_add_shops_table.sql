create table if not exists shops
(
    id                  bigint primary key,
    created_at          timestamp    not null,
    updated_at          timestamp    not null,
    number              integer      not null unique,
    name                varchar(150) not null,
    phone               varchar(100),
    note                text,
    contact_person      varchar(100),
    address_street      varchar(100) not null,
    address_postal_code integer      not null,
    address_city        varchar(50)  not null
);
