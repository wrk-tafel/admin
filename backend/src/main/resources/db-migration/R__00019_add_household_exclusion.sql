alter table if exists customers_addpersons
    add column exclude_household boolean not null default false;
