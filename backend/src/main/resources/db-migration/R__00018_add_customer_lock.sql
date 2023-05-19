alter table if exists customers
    add column locked boolean not null default false;
alter table if exists customers
    add column locked_by bigint null REFERENCES users (id) ON DELETE SET NULL;
alter table if exists customers
    add column lock_reason text null;