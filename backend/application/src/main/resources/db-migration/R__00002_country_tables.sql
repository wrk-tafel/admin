DROP TABLE IF EXISTS country;

create table country(
	id bigint not null primary key,
	version integer not null,
	code varchar(2) not null,
	name varchar(50) not null
);

create unique index uix_country_code on country (code);
create unique index uix_country_name on country (name);
