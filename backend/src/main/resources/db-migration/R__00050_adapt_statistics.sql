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

update distributions_statistics
set shops_total_count = 0
where shops_total_count is null;

alter table distributions_statistics
    alter column shops_total_count set not null;

alter table distributions_statistics
    alter column shops_with_food_count set default 0;

update distributions_statistics
set shops_with_food_count = 0
where shops_with_food_count is null;

alter table distributions_statistics
    alter column shops_with_food_count set not null;

alter table distributions_statistics
    alter column food_total_amount set default 0;

update distributions_statistics
set food_total_amount = 0
where food_total_amount is null;

alter table distributions_statistics
    alter column food_total_amount set not null;

alter table distributions_statistics
    alter column food_per_shop_average set default 0;

update distributions_statistics
set food_per_shop_average = 0
where food_per_shop_average is null;

alter table distributions_statistics
    alter column food_per_shop_average set not null;

alter table distributions_statistics
    alter column routes_length_km set default 0;

update distributions_statistics
set routes_length_km = 0
where routes_length_km is null;

alter table distributions_statistics
    alter column routes_length_km set not null;
