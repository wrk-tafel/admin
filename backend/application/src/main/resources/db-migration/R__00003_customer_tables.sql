DROP TABLE IF EXISTS customer;

create table customer(
	id bigint not null primary key,
	version integer not null,
	created_at timestamp not null,
	updated_at timestamp not null,
	customer_id integer not null,
	firstname varchar(50) not null,
	lastname varchar(50) not null,
	gender varchar(10) not null,
	birth_date date not null,
    telephone_number bigint null,
    email varchar(75) null
);

create unique index uix_customer_id on customer (customer_id);
create unique index uix_customer_telephone_number on customer (telephone_number);
create unique index uix_customer_email on customer (email);
