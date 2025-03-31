create table if not exists scanner_registrations
(
    id                bigint     not null
        primary key,
    registration_time timestamp  not null,
    scanner_id        int unique not null
);

create table if not exists scanner_results
(
    id          bigint    not null
        primary key,
    scan_time   timestamp not null,
    scanner_id  int       not null,
    customer_id bigint    not null
);

CREATE OR REPLACE TRIGGER trigger_notify_scanner_results
    AFTER INSERT
    ON scanner_results
    FOR EACH ROW
EXECUTE FUNCTION notify_channel_with_row_data('scanner_result_inserted');
