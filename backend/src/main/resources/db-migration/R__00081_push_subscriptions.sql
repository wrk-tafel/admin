create table if not exists push_subscriptions
(
    id         bigint primary key,
    created_at timestamp     not null,
    updated_at timestamp     not null,
    user_id    bigint        not null references users (id) on delete cascade,
    endpoint   varchar(1000) not null,
    p256dh_key varchar(255)  not null,
    auth_key   varchar(255)  not null,
    unique (endpoint)
);

create sequence if not exists push_subscriptions_seq
    start with 1
    increment by 50
    owned by push_subscriptions.id;
