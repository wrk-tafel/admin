DROP TABLE IF EXISTS static_values;

create table static_values(
	id bigint not null primary key,
	created_at timestamp not null,
	updated_at timestamp not null,
    type varchar(25) not null,
    value numeric not null,
    valid_from date not null,
    valid_to date not null
);

create unique index uix_type_validFrom_validTo on static_values (type, valid_from, valid_to);
create unique index uix_type_validFrom on static_values (type, valid_from);
create unique index uix_type_validTo on static_values (type, valid_to);