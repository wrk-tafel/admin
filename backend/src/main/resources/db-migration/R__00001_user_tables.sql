create table if not exists users
(
    id                      bigint primary key,
    created_at              timestamp    not null,
    updated_at              timestamp    not null,
    username                varchar(50)  not null unique,
    password                varchar(500) not null,
    enabled                 boolean      not null default false,
    personnel_number        varchar(50)  not null unique,
    firstname               varchar(50)  not null,
    lastname                varchar(50)  not null,
    passwordchange_required boolean      not null default false
);

create index if not exists idx_users_username on users (username);

create table if not exists users_authorities
(
    id         bigint primary key,
    created_at timestamp   not null,
    updated_at timestamp   not null,
    user_id    bigint      not null REFERENCES users (id),
    name       varchar(50) not null
);

create unique index if not exists uidx_users_authorities_userid_name on users_authorities (user_id, name);
create index if not exists idx_users_authorities_userid on users_authorities (user_id);
