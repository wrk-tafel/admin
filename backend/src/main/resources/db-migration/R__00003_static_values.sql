DROP TABLE IF EXISTS static_values;

create table static_values(
	id bigint primary key,
	created_at timestamptz not null,
	updated_at timestamptz not null,
    type varchar(50) not null,
    amount numeric not null,
    valid_from date not null,
    valid_to date not null,
    count_adult integer null,
    count_child integer null,
    additional_adult boolean null,
    additional_child boolean null,
    age integer null
);

create unique index uix_type_counts on static_values (type, valid_from, valid_to, count_adult, count_child);
create unique index uix_type_additional_adult on static_values (type, valid_from, valid_to, additional_adult);
create unique index uix_type_additional_child on static_values (type, valid_from, valid_to, additional_child);

create unique index uix_type_age on static_values (type, valid_from, valid_to, age);
