-- Tracks the most recent successful login per user, updated in place on every login rather than
-- via the audit trail (which would otherwise gain one entry per login for every user in the
-- system - see AuditScope). Nullable: an existing account has no recorded login until its next
-- one, and a freshly created account has never logged in at all. Intended to later support
-- deleting/deactivating accounts that have gone unused for a GDPR-driven retention period.
alter table if exists users
    add column if not exists last_login timestamp null;
