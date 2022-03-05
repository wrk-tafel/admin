DROP TABLE IF EXISTS income_limits;

create table income_limits(
	id bigint not null primary key,
	created_at timestamp not null,
	updated_at timestamp not null,
    type varchar(25) not null,
    value numeric not null,
    valid_from date not null,
    valid_to date not null
);

create unique index uix_type_validFrom_validTo on income_limits (type, valid_from, valid_to);
