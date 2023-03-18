alter table if exists customers_addpersons
    add column if not exists employer varchar(100) null;
