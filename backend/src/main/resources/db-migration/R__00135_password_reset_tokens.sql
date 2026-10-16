-- "Passwort vergessen?" (issue #3840, ADR-0072): a single-use link mailed to the address on the
-- account. Only the SHA-256 of the 256-bit token is stored, never the token itself, so a copy of
-- this table cannot be used to reset anybody's password.
--
-- A user has at most one live token - a new request replaces the earlier one. used_at marks the
-- token that set a password; it stays until the cleanup removes it with the expired ones
-- (PasswordResetTokenCleanupService). Deleting a user deletes their tokens with them.

create table if not exists password_reset_tokens
(
    id         bigint                   not null
        constraint password_reset_tokens_pk primary key,
    user_id    bigint                   not null references users (id) on delete cascade,
    token_hash varchar(64)              not null,
    expires_at timestamp with time zone not null,
    used_at    timestamp with time zone,
    created_at timestamp with time zone not null default now()
);

create sequence if not exists password_reset_tokens_seq start with 1 increment by 50 owned by password_reset_tokens.id;

create unique index if not exists password_reset_tokens_token_hash_idx on password_reset_tokens (token_hash);
create index if not exists password_reset_tokens_user_id_idx on password_reset_tokens (user_id);
create index if not exists password_reset_tokens_expires_at_idx on password_reset_tokens (expires_at);
