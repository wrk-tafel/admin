alter table if exists customers
    add column if not exists receives_familybonus bool default false not null;
alter table if exists customers_addpersons
    add column if not exists receives_familybonus bool default false not null;
