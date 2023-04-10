create table if not exists distributions_customers
(
    id              bigint primary key,
    created_at      timestamp not null,
    updated_at      timestamp not null,
    distribution_id bigint    not null REFERENCES distributions (id) ON DELETE CASCADE,
    customer_id     bigint    not null REFERENCES customers (id) ON DELETE CASCADE,
    ticket_number   integer   not null,
    UNIQUE (distribution_id, customer_id)
);
