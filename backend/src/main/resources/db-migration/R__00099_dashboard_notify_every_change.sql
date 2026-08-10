-- A dashboard change is recorded as at most one `sse_outbox` row per second (see R__00059), but the
-- row is not what refreshes anybody's screen: the `pg_notify` its insert fires is (R__00057). So a
-- change landing in a second that already has a row produced nothing at all - `ON CONFLICT DO
-- NOTHING` wrote no row, and that second's notification had long since been delivered, leaving every
-- open dashboard showing the state from a fraction of a second earlier until the next change in a
-- later second (issue #3168).
--
-- The row stays coalesced - keeping `sse_outbox` small is what that is for - but the notification is
-- now sent either way, by hand when the row was already there. That costs no extra dashboard
-- refreshes within a transaction: Postgres delivers identical notifications signalled in the same
-- transaction once, so saving a food collection with thirty items still wakes the dashboard exactly
-- once, whether its rows were coalesced or not.
--
-- `clock_timestamp()` rather than `NOW()`, which is the *transaction's* start time: a transaction
-- that runs for a while would otherwise file its changes under a second that passed before they
-- happened, and a row timestamped before the watermark a reconnecting listener replays from is one
-- it never replays.
CREATE OR REPLACE FUNCTION insert_dashboard_update_to_sse_outbox()
    RETURNS trigger AS
$$
DECLARE
    current_second TIMESTAMP;
    inserted_rows  INTEGER;
BEGIN
    current_second := date_trunc('second', clock_timestamp());

    INSERT INTO sse_outbox (id, event_time, notification_name, payload)
    VALUES (nextval('sse_outbox_seq'), current_second, 'dashboard_update', null)
    ON CONFLICT (notification_name, event_time) DO NOTHING;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;

    IF inserted_rows = 0 THEN
        -- Byte-for-byte the payload sse_outbox_notify_channel() builds for a row it did insert
        -- (R__00057) - a listener must not be able to tell the two apart.
        PERFORM pg_notify(
                'sse_outbox',
                json_build_object('notificationName', 'dashboard_update', 'payload', null)::text
                );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
