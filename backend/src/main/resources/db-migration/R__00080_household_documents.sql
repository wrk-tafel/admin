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

-- Hibernate's id.db_structure_naming_strategy is "standard" in this app (see R__00070) - every
-- entity table needs its own "<table>_seq" sequence, incremented by 50 to match Hibernate's
-- default allocationSize.
create sequence if not exists household_documents_seq
    start with 1
    increment by 50
    owned by household_documents.id;
