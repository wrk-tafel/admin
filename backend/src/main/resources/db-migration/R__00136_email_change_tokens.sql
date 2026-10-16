-- Changing the own e-mail address under "Mein Konto" > "Meine Daten" (issue #3840, ADR-0072): the new
-- address is held here until a single-use link mailed to the address the account has *now* is
-- confirmed. Only the SHA-256 of the token is stored. old_email is the address the link went to - a
-- confirmation after the address was changed in the meantime (e.g. by an administrator) is refused.
--
-- At most one pending change per user; a new request replaces it. Deleting a user deletes it with
-- them, and the user's data takeout lists it (the pending address is personal data).

create table if not exists email_change_tokens
(
    id         bigint                   not null
        constraint email_change_tokens_pk primary key,
    user_id    bigint                   not null references users (id) on delete cascade,
    old_email  varchar(255)             not null,
    new_email  varchar(255)             not null,
    token_hash varchar(64)              not null,
    expires_at timestamp with time zone not null,
    created_at timestamp with time zone not null default now()
);

create sequence if not exists email_change_tokens_seq start with 1 increment by 50 owned by email_change_tokens.id;

create unique index if not exists email_change_tokens_token_hash_idx on email_change_tokens (token_hash);
create unique index if not exists email_change_tokens_user_id_idx on email_change_tokens (user_id);
create index if not exists email_change_tokens_expires_at_idx on email_change_tokens (expires_at);
