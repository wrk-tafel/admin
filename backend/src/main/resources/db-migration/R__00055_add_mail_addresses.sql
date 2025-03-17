create table if not exists mail_recipients
(
    id             bigint       not null
        constraint mail_recipients_pk
            primary key,
    mail_type      varchar(30)  not null,
    recipient_type varchar(30)  not null,
    address      varchar(320) not null
);

create index if not exists mail_recipients_mail_type_index
    on mail_recipients (mail_type);
