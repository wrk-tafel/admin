alter table if exists customers_addpersons
    add column if not exists receives_familybonus bool default false not null;

-- update existing data as we assumed it currently that it's given
update customers_addpersons set receives_familybonus = true;
