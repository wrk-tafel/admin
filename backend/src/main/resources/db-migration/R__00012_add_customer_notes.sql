create table if not exists customers_notes
(
    id          bigint primary key,
    created_at  timestamp not null,
    updated_at  timestamp not null,
    customer_id bigint    not null REFERENCES customers (id) ON DELETE CASCADE,
    user_id     bigint    not null REFERENCES users (id) ON DELETE SET NULL,
    note        text      not null
);
