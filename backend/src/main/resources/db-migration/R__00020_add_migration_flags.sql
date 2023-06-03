alter table if exists users
    add column if not exists migrated boolean not null default false;
alter table if exists users
    add column if not exists migration_date timestamp null;

alter table if exists customers
    add column if not exists migrated boolean not null default false;
alter table if exists customers
    add column if not exists migration_date timestamp null;
