alter table customers
    alter column telephone_number type varchar using telephone_number::varchar;