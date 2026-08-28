-- Mirrors login_attempts (R__00069), but keyed by the calling IP address rather than the username
-- being attempted, so a distributed credential-stuffing attempt across many usernames from one IP is
-- caught too - see LoginAttemptIpService. Named login_attempts_ip (not ip_login_attempts) so it sorts
-- and groups next to login_attempts.

create table if not exists login_attempts_ip
(
    id              bigint primary key,
    created_at      timestamp   not null,
    updated_at      timestamp   not null,
    created_by      bigint references users (id) on delete set null,
    updated_by      bigint references users (id) on delete set null,
    ip_address      varchar(45) not null unique, -- long enough for an IPv6 address
    failure_count   integer     not null default 0,
    last_failure_at timestamp   not null,
    locked_until    timestamp
);

create sequence if not exists login_attempts_ip_seq start with 1 increment by 50 owned by login_attempts_ip.id;
