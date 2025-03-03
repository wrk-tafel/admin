create table if not exists shelters
(
    id                  bigint       not null
        constraint shelters_pk primary key,
    created_at          timestamp    not null,
    updated_at          timestamp    not null,
    name                varchar(100) not null unique,
    address_street      varchar(100) not null,
    address_houseNumber varchar(10)  not null,
    address_stairway    varchar(5)   null,
    address_postalCode  integer      not null,
    address_city        varchar(50)  not null,
    address_door        varchar(10)  null,
    note                text         null,
    persons_count       integer      not null
);

create table if not exists shelters_contacts
(
    id         bigint       not null
        constraint shelters_contacts_pk primary key,
    created_at timestamp    not null,
    updated_at timestamp    not null,
    shelter_id bigint       not null
        constraint shelters_contacts_shelter_id_fk references shelters on delete cascade,
    firstname  varchar(100) not null unique,
    lastname   varchar(100) not null unique,
    phone      varchar(100) not null
);

create table if not exists distributions_statistics_shelters
(
    id                        bigint       not null
        constraint distributions_statistics_shelters_pk
            primary key,
    created_at                timestamp    not null,
    updated_at                timestamp    not null,
    distribution_statistic_id bigint       not null
        constraint distributions_statistics_shelters_distribution_statistic_id_fk
            references distributions_statistics on delete cascade,
    name                      varchar(100) not null unique,
    address_street            varchar(100) not null,
    address_houseNumber       varchar(10)  not null,
    address_stairway          varchar(5)   null,
    address_postalCode        integer      not null,
    address_city              varchar(50)  not null,
    address_door              varchar(10)  null,
    persons_count             integer      not null
);
