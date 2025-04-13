create table if not exists scanner_registrations
(
    id                bigint     not null
        primary key,
    registration_time timestamp  not null,
    scanner_id        int unique not null
);

create index if not exists idx_scanner_registrations_registration_time
    on scanner_registrations (registration_time);
create index if not exists idx_scanner_registrations_scanner_id
    on scanner_registrations (scanner_id);
