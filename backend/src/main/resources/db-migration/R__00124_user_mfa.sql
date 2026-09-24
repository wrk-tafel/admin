-- Two-factor authentication, per user and optional, with two methods a user can use side by side: a code
-- from an authenticator app (TOTP, RFC 6238) and a code sent by e-mail.
--
-- mfa_secret is the authenticator app's secret. It is set when a user starts that setup and only counts once
-- mfa_totp_enabled is true, i.e. after they proved their app produces valid codes. mfa_last_used_step is the
-- time step of the last accepted app code: a code is only accepted for a later step, so an observed code
-- cannot be replayed. It is written by a bulk update, not through the entity, so a login does not touch
-- updated_at or the audit trail.
--
-- mfa_email_enabled is the e-mail method, switched on after a code sent to the user's address was entered.
-- The codes themselves live in mfa_email_codes - one row per user, only its hash, deleted when used.

alter table users add column if not exists mfa_secret varchar(64);
alter table users add column if not exists mfa_totp_enabled boolean not null default false;
alter table users add column if not exists mfa_email_enabled boolean not null default false;
alter table users add column if not exists mfa_last_used_step bigint;

create table if not exists mfa_email_codes
(
    id         bigint                   not null
        constraint mfa_email_codes_pk primary key,
    user_id    bigint                   not null references users (id) on delete cascade,
    code_hash  varchar(64)              not null,
    expires_at timestamp with time zone not null,
    created_at timestamp with time zone not null default now()
);

create sequence if not exists mfa_email_codes_seq start with 1 increment by 50 owned by mfa_email_codes.id;

create unique index if not exists mfa_email_codes_user_id_idx on mfa_email_codes (user_id);
create index if not exists mfa_email_codes_expires_at_idx on mfa_email_codes (expires_at);
