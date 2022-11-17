alter table if exists customers_addpersons
    add column if not exists country_id bigint not null REFERENCES static_countries (id);
