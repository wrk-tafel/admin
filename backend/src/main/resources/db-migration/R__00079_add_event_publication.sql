-- Schema for spring-modulith-starter-jpa's event publication registry (tracks async
-- @ApplicationModuleListener invocations for at-least-once delivery). Column names/types/constraints
-- mirror exactly what Hibernate itself generates for
-- org.springframework.modulith.events.jpa.updating.DefaultJpaEventPublication /
-- org.springframework.modulith.events.jpa.archiving.ArchivedJpaEventPublication (verified via a
-- scratch SchemaExport run against this project's actual Hibernate/PostgreSQL versions). Both tables
-- are created regardless of spring.modulith.events.completion-mode, since that property can be
-- flipped between "update" (event_publication only) and "archive" (event_publication_archive too)
-- without needing a follow-up migration either way.
create table if not exists event_publication
(
    id                      uuid                     not null
        constraint event_publication_pk
            primary key,
    listener_id             varchar(255)             not null,
    event_type              varchar(255)             not null,
    serialized_event        varchar(255)             not null,
    publication_date        timestamp with time zone not null,
    completion_date         timestamp with time zone,
    last_resubmission_date  timestamp with time zone,
    completion_attempts     integer                  not null,
    status                  varchar(255)
        constraint event_publication_status_check
            check (status in ('PUBLISHED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RESUBMITTED'))
);

create table if not exists event_publication_archive
(
    id                      uuid                     not null
        constraint event_publication_archive_pk
            primary key,
    listener_id             varchar(255)             not null,
    event_type              varchar(255)             not null,
    serialized_event        varchar(255)             not null,
    publication_date        timestamp with time zone not null,
    completion_date         timestamp with time zone,
    last_resubmission_date  timestamp with time zone,
    completion_attempts     integer                  not null,
    status                  varchar(255)
        constraint event_publication_archive_status_check
            check (status in ('PUBLISHED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RESUBMITTED'))
);
