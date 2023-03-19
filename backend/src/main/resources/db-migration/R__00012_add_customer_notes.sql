create table if not exists customers_notes
(
    id          bigint primary key,
    created_at  timestamp not null,
    updated_at  timestamp not null,
    customer_id bigint    not null REFERENCES customers (id),
    user_id     bigint    not null REFERENCES users (id),
    note        text      not null
);
