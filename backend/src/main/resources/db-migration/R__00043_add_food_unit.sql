alter table if exists shops
    add column if not exists food_unit varchar(10) not null default 'BOX';
