create table if not exists distributions_statistics
(
    id                      bigint primary key,
    created_at              timestamp   not null,
    updated_at              timestamp   not null,
    distribution_id         bigint      not null REFERENCES distributions (id) ON DELETE CASCADE,
    -- TODO
    -- lastname                varchar(50) not null,
    -- passwordchange_required boolean     not null default false
);
