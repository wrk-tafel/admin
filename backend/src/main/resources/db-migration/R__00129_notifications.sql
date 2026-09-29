-- The bell in the header: a per-user inbox of notifications (mirroring what is pushed, so a user
-- without push enabled sees it at the next login) plus announcements an administrator publishes
-- for every user.

create table if not exists notifications
(
    id          bigint primary key,
    created_at  timestamptz not null,
    user_id     bigint        not null references users (id) on delete cascade,
    type        varchar(100)  not null,
    title       varchar(200)  not null,
    body        varchar(1000) not null,
    target_path varchar(200)  null,
    read_at     timestamptz null
);

create index if not exists notifications_user_created_idx on notifications (user_id, created_at desc);
create index if not exists notifications_created_idx on notifications (created_at);

create sequence if not exists notifications_seq
    start with 1
    increment by 50
    owned by notifications.id;

create table if not exists announcements
(
    id         bigint primary key,
    created_at timestamptz not null,
    created_by bigint        null references users (id) on delete set null,
    title      varchar(200)  not null,
    message    varchar(2000) not null,
    expires_at timestamptz null
);

create sequence if not exists announcements_seq
    start with 1
    increment by 50
    owned by announcements.id;

create table if not exists announcement_reads
(
    announcement_id bigint    not null references announcements (id) on delete cascade,
    user_id         bigint    not null references users (id) on delete cascade,
    read_at         timestamptz not null,
    primary key (announcement_id, user_id)
);
