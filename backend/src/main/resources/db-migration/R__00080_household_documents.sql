create table if not exists household_documents
(
    id                  bigint primary key,
    created_at          timestamp    not null,
    updated_at          timestamp    not null,
    household_id        bigint       not null references households (id) on delete cascade,
    person_id           bigint       null references persons (id) on delete set null,
    document_type       varchar(50)  not null,
    file_name           varchar(255) not null,
    content_type        varchar(100) not null,
    storage_path        varchar(500) not null,
    uploaded_by_user_id bigint       null references users (id) on delete set null
);
