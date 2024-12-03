alter table if exists distributions_statistics
    add column if not exists shops_total_count integer;

alter table if exists distributions_statistics
    add column if not exists shops_with_food_count integer;

alter table if exists distributions_statistics
    add column if not exists food_total_amount decimal;

alter table if exists distributions_statistics
    add column if not exists food_per_shop_average decimal;

alter table if exists distributions_statistics
    add column if not exists routes_length_km integer;
