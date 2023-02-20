create table if not exists distributions
(
    id               bigint primary key,
    created_at       timestamp not null,
    updated_at       timestamp not null,
    started_at       timestamp not null,
    ended_at         timestamp null,
    startedby_userid bigint    not null REFERENCES users (id)
);
