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

-- Browser/OS of the device at subscribe time, for a human-friendly label in the settings device
-- list. Separate "add column if not exists" (rather than inline in the create table above) since
-- this repeatable migration already ran against environments with an existing push_subscriptions
-- table before this column was added - "create table if not exists" alone would silently skip
-- those environments and never add it.
alter table if exists push_subscriptions
    add if not exists user_agent varchar(500) null;

-- User-defined override for the auto-detected browser/OS label, so a device can be identified by
-- something more meaningful (e.g. "Kiosk Ausgabe 1") than "Chrome unter Windows".
alter table if exists push_subscriptions
    add if not exists label varchar(100) null;

create sequence if not exists push_subscriptions_seq
    start with 1
    increment by 50
    owned by push_subscriptions.id;
