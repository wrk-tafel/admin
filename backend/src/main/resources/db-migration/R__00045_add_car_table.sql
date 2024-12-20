create table if not exists cars
(
    id            bigint      not null
        constraint cars_pk
            primary key,
    created_at    timestamp   not null,
    updated_at    timestamp   not null,
    license_plate varchar(20) not null,
    name          varchar(50)
);

alter table if exists food_collections
    alter column car_license_plate drop not null;

alter table if exists food_collections
    add column if not exists car_id bigint;

alter table if exists food_collections
    add constraint food_collections_cars_id_fk
        foreign key (car_id) references cars;
