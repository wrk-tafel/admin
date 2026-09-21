-- Per-user display preferences, one row per user. Absence of a row means the defaults, so no
-- backfill is needed: theme SYSTEM follows the operating system's light/dark setting.
create table if not exists user_preferences
(
    id         bigint primary key,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    created_by bigint references users (id) on delete set null,
    updated_by bigint references users (id) on delete set null,
    user_id    bigint      not null references users (id) on delete cascade,
    theme      varchar(10) not null default 'SYSTEM',
    unique (user_id)
);

create sequence if not exists user_preferences_seq
    start with 1
    increment by 50
    owned by user_preferences.id;
