alter table if exists food_collections
    alter column km_start drop not null;

alter table if exists food_collections
    alter column km_end drop not null;
