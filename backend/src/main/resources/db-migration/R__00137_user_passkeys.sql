-- Passkeys (WebAuthn credentials) as a further way to complete a login's second step, next to the
-- authenticator app and the e-mailed code (see R__00124_user_mfa.sql and ADR-0074).
--
-- user_passkeys holds one row per registered passkey. credential_id is the id the authenticator chose
-- (base64url), attested_credential_data the AAGUID, credential id and public key as the authenticator
-- delivered them - no secret, the private key never leaves the device. sign_count and last_used_at are
-- written by a bulk update on every use, not through the entity, so a login does not touch the audit
-- trail.
--
-- users.mfa_passkey_enabled says whether a user has at least one, kept in step by MfaService, so what a
-- login offers can be read from the users row alone.
--
-- passkey_challenges remembers the random challenge between "give me the options" and "here is the
-- answer" - in the database because there is no server-side session and a deploy runs two instances.
-- One row per user and purpose, deleted when it is answered.

alter table users add column if not exists mfa_passkey_enabled boolean not null default false;

create table if not exists user_passkeys
(
    id                       bigint                   not null
        constraint user_passkeys_pk primary key,
    user_id                  bigint                   not null references users (id) on delete cascade,
    credential_id            varchar(1400)            not null,
    name                     varchar(100)             not null,
    attested_credential_data bytea                    not null,
    transports               varchar(200),
    sign_count               bigint                   not null default 0,
    created_at               timestamp with time zone not null default now(),
    last_used_at             timestamp with time zone
);

create sequence if not exists user_passkeys_seq start with 1 increment by 50 owned by user_passkeys.id;

create unique index if not exists user_passkeys_credential_id_idx on user_passkeys (credential_id);
create index if not exists user_passkeys_user_id_idx on user_passkeys (user_id);

create table if not exists passkey_challenges
(
    id         bigint                   not null
        constraint passkey_challenges_pk primary key,
    user_id    bigint                   not null references users (id) on delete cascade,
    purpose    varchar(20)              not null,
    challenge  varchar(100)             not null,
    expires_at timestamp with time zone not null,
    created_at timestamp with time zone not null default now()
);

create sequence if not exists passkey_challenges_seq start with 1 increment by 50 owned by passkey_challenges.id;

create unique index if not exists passkey_challenges_user_purpose_idx on passkey_challenges (user_id, purpose);
create index if not exists passkey_challenges_expires_at_idx on passkey_challenges (expires_at);
