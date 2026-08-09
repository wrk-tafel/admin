-- Append-only audit trail: who changed what, and what it looked like before.
--
-- One row per audited entity per write, produced from Hibernate's post-insert/update/delete events
-- (see AuditLogWriter) rather than from database triggers. The trade-off that decision buys and
-- costs is recorded in ADR-0039; the short version is that the acting user is only known to the
-- application, and a trigger that has to be handed the actor per transaction logs an anonymous
-- change whenever a write path forgets to hand it over.
--
-- Nothing ever updates or deletes a row here except the retention job (AuditRetentionService).
create table if not exists audit_log
(
    id             bigint       primary key,

    occurred_at    timestamp    not null,

    -- Who. Both denormalized on purpose: no foreign key to users(id), so the row survives the
    -- account being renamed or deleted, which is exactly when an audit trail has to still be
    -- readable. actor_user_id stays null for writes no user is behind (scheduled jobs, testdata).
    actor_user_id  bigint,
    actor_username varchar(255),

    -- What. entity_type is the JPA entity name (e.g. 'Household', 'Person'), entity_id its primary
    -- key. business_key holds the household number for household-scoped entities and the username
    -- for user-scoped ones, so the row stays meaningful once the referenced row itself is gone -
    -- after a merge or a household deletion, entity_id points at nothing.
    entity_type    varchar(100) not null,
    entity_id      bigint,
    business_key   varchar(255),

    operation      varchar(10)  not null,

    -- {"addressCity": ["Wien", "Graz"], ...} - old/new pairs for the fields that actually changed.
    -- For INSERT the old side is null, for DELETE the new side is.
    changed_fields jsonb
);

create sequence if not exists audit_log_seq
    start with 1
    increment by 50
    owned by audit_log.id;

-- The global admin log screen: newest first, optionally narrowed by actor/type/date.
create index if not exists idx_audit_log_occurred_at
    on audit_log (occurred_at desc, id desc);

-- The per-household "Verlauf" tab: every entry for one household number across its entity types.
create index if not exists idx_audit_log_business_key
    on audit_log (business_key, occurred_at desc);

create index if not exists idx_audit_log_entity
    on audit_log (entity_type, entity_id);

create index if not exists idx_audit_log_actor
    on audit_log (actor_username);
