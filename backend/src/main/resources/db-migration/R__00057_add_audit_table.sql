create table if not exists audit_logs
(
    id                bigint       not null
        primary key,
    action            varchar(50)  not null,
    changed_by        varchar(100) not null,
    changed_timestamp timestamp    not null,
    table_name        varchar(50)  not null,
    primary_key       bigint       not null,
    data_before       jsonb        not null,
    data_after        jsonb        not null
);
