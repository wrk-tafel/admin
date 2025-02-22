DROP TABLE IF EXISTS customers_addpersons;
DROP TABLE IF EXISTS customers;

create sequence if not exists customer_id_sequence;

create table if not exists customers
(
    id                  bigint primary key,
    created_at          timestamp    not null,
    updated_at          timestamp    not null,
    customer_id         bigint       not null unique,
    user_id             bigint       not null REFERENCES users (id),
    firstname           varchar(50)  not null,
    lastname            varchar(50)  not null,
    birth_date          date         not null,
    country_id          bigint       not null REFERENCES static_countries (id),
    address_street      varchar(100) not null,
    address_houseNumber varchar(10)  not null,
    address_stairway    varchar(5)   null,
    address_postalCode  integer      not null,
    address_city        varchar(50)  not null,
    address_door        varchar(10)  null,
    telephone_number    bigint       null,
    email               varchar(100) null,
    employer            varchar(100) null,
    income              decimal      null,
    income_due          date         null,
    valid_until         date         not null
);

create table if not exists customers_addpersons
(
    id          bigint primary key,
    created_at  timestamp   not null,
    updated_at  timestamp   not null,
    customer_id bigint      not null,
    firstname   varchar(50) not null,
    lastname    varchar(50) not null,
    birth_date  date        not null,
    income      decimal     null,
    income_due  date        null
);
