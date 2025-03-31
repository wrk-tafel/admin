create table if not exists sse_outbox
(
    id                bigint      not null
        primary key,
    event_time        timestamp   not null,
    notification_name varchar(63) not null,
    payload           text
);

ALTER TABLE sse_outbox
    ADD CONSTRAINT unique_notification_name_event_time UNIQUE (notification_name, event_time);

CREATE OR REPLACE FUNCTION sse_outbox_notify_channel()
    RETURNS TRIGGER AS
$$
DECLARE
    notification_payload TEXT;
BEGIN
    notification_payload := json_build_object(
            'notificationName', NEW.notification_name,
            'payload', NEW.payload
                            )::text;

    PERFORM pg_notify('sse_outbox', notification_payload);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_sse_outbox_notification
    AFTER INSERT
    ON sse_outbox
    FOR EACH ROW
EXECUTE FUNCTION sse_outbox_notify_channel();

create index if not exists idx_sse_outbox_notification_name
    on sse_outbox (notification_name);
create index if not exists idx_sse_outbox_event_time
    on sse_outbox (event_time);
