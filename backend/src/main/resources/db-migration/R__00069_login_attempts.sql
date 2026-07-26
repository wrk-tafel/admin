create table if not exists login_attempts
(
    id              bigint primary key,
    created_at      timestamp   not null,
    updated_at      timestamp   not null,
    username        varchar(50) not null unique,
    failure_count   integer     not null default 0,
    last_failure_at timestamp   not null,
    locked_until    timestamp
);
