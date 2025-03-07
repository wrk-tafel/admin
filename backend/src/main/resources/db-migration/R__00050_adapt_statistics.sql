alter table distributions_statistics
    alter column count_customers set default 0;

alter table distributions_statistics
    alter column count_persons set default 0;

alter table distributions_statistics
    alter column count_infants set default 0;

alter table distributions_statistics
    alter column average_persons_per_customer set default 0;

alter table distributions_statistics
    alter column count_customers_new set default 0;

alter table distributions_statistics
    alter column count_customers_prolonged set default 0;

alter table distributions_statistics
    alter column count_customers_updated set default 0;

alter table distributions_statistics
    alter column count_persons_new set default 0;

alter table distributions_statistics
    alter column count_persons_prolonged set default 0;

alter table distributions_statistics
    alter column shops_total_count set default 0;

alter table distributions_statistics
    alter column shops_total_count set not null;

alter table distributions_statistics
    alter column shops_with_food_count set default 0;

alter table distributions_statistics
    alter column shops_with_food_count set not null;

alter table distributions_statistics
    alter column food_total_amount set default 0;

alter table distributions_statistics
    alter column food_total_amount set not null;

alter table distributions_statistics
    alter column food_per_shop_average set default 0;

alter table distributions_statistics
    alter column food_per_shop_average set not null;

alter table distributions_statistics
    alter column routes_length_km set default 0;

alter table distributions_statistics
    alter column routes_length_km set not null;
