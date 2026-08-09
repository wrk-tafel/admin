create table if not exists mail_outbox
(
    id              bigint       not null
        primary key,
    created_at      timestamp    not null,
    subject         varchar(500) not null,
    recipients      text         not null,
    message         bytea        not null,
    status          varchar(20)  not null,
    attempts        integer      not null default 0,
    next_attempt_at timestamp    not null,
    last_error      text,
    sent_at         timestamp
);

create sequence if not exists mail_outbox_seq start with 1 increment by 50 owned by mail_outbox.id;

-- What the sender polls for: the pending rows whose next attempt is due, oldest first.
create index if not exists idx_mail_outbox_status_next_attempt_at
    on mail_outbox (status, next_attempt_at);
