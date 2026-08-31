alter table static_countries
    add column if not exists enabled boolean not null default true;
