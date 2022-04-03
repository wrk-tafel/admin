DROP TABLE IF EXISTS customers;

create table customers(
	id bigint primary key,
	created_at timestamp not null,
	updated_at timestamp not null,
	customer_id integer not null,
	firstname varchar(50) not null,
	lastname varchar(50) not null,
	birth_date date not null,
    address_street varchar(100) not null,
    address_housenumber varchar(10) not null,
    address_stairway varchar(5) null,
    address_postalCode integer not null,
    address_city varchar(50) not null,
	telephone_number bigint null,
    email varchar(75) null,
    count_persons_in_household integer null default 0,
    count_infants integer null default 0
);

create unique index uix_customer_id on customers (customer_id);
create unique index uix_customer_telephone_number on customers (telephone_number);
create unique index uix_customer_email on customers (email);
