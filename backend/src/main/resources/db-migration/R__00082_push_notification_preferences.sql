-- Master switch: one row per user, whether push notifications are enabled at all across every
-- device they've registered. Absence of a row means enabled - matches the previous behaviour of
-- every subscribed device receiving every push, so no backfill is required.
create table if not exists push_preferences
(
    id         bigint primary key,
    created_at timestamp not null,
    updated_at timestamp not null,
    user_id    bigint    not null references users (id) on delete cascade,
    enabled    boolean   not null default true,
    unique (user_id)
);

create sequence if not exists push_preferences_seq
    start with 1
    increment by 50
    owned by push_preferences.id;

-- Per-notification-type opt-out, e.g. "distribution started" vs. "distribution closed". Absence
-- of a row for a given (user, type) means enabled, same reasoning as push_preferences above.
create table if not exists push_type_preferences
(
    id                bigint      primary key,
    created_at        timestamp   not null,
    updated_at        timestamp   not null,
    user_id           bigint      not null references users (id) on delete cascade,
    notification_type varchar(50) not null,
    enabled           boolean     not null default true,
    unique (user_id, notification_type)
);

create sequence if not exists push_type_preferences_seq
    start with 1
    increment by 50
    owned by push_type_preferences.id;
