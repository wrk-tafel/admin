alter table routes
    add column if not exists enabled boolean default true not null;

alter table shops
    add column if not exists enabled boolean default true not null;
