CREATE OR REPLACE FUNCTION insert_dashboard_update_to_sse_outbox()
    RETURNS trigger AS
$$
DECLARE
    current_second TIMESTAMP;
BEGIN
    -- Get the current time truncated to the second to reduce the number of notifications
    current_second := date_trunc('second', NOW());

    INSERT INTO sse_outbox (id, event_time, notification_name, payload)
    VALUES (nextval('sse_outbox_seq'), current_second, 'dashboard_update', null)
    ON CONFLICT (notification_name, event_time) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_dashboard_update_notification
    AFTER INSERT OR UPDATE OR DELETE
    ON distributions
    FOR EACH ROW
EXECUTE FUNCTION insert_dashboard_update_to_sse_outbox();

CREATE OR REPLACE TRIGGER trigger_dashboard_update_notification
    AFTER INSERT OR UPDATE OR DELETE
    ON distributions
    FOR EACH ROW
EXECUTE FUNCTION insert_dashboard_update_to_sse_outbox();

-- distributions_customers was renamed to distributions_households in R__00067; on a fresh
-- database this migration runs before that rename, so the table can still exist under either name
DO
$$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'distributions_households') THEN
        EXECUTE 'CREATE OR REPLACE TRIGGER trigger_dashboard_update_notification
            AFTER INSERT OR UPDATE OR DELETE
            ON distributions_households
            FOR EACH ROW
            EXECUTE FUNCTION insert_dashboard_update_to_sse_outbox()';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'distributions_customers') THEN
        EXECUTE 'CREATE OR REPLACE TRIGGER trigger_dashboard_update_notification
            AFTER INSERT OR UPDATE OR DELETE
            ON distributions_customers
            FOR EACH ROW
            EXECUTE FUNCTION insert_dashboard_update_to_sse_outbox()';
    END IF;
END
$$;

CREATE OR REPLACE TRIGGER trigger_dashboard_update_notification
    AFTER INSERT OR UPDATE OR DELETE
    ON distributions_statistics
    FOR EACH ROW
EXECUTE FUNCTION insert_dashboard_update_to_sse_outbox();

CREATE OR REPLACE TRIGGER trigger_dashboard_update_notification
    AFTER INSERT OR UPDATE OR DELETE
    ON distributions_statistics_shelters
    FOR EACH ROW
EXECUTE FUNCTION insert_dashboard_update_to_sse_outbox();

CREATE OR REPLACE TRIGGER trigger_dashboard_update_notification
    AFTER INSERT OR UPDATE OR DELETE
    ON food_collections
    FOR EACH ROW
EXECUTE FUNCTION insert_dashboard_update_to_sse_outbox();

CREATE OR REPLACE TRIGGER trigger_dashboard_update_notification
    AFTER INSERT OR UPDATE OR DELETE
    ON food_collections_items
    FOR EACH ROW
EXECUTE FUNCTION insert_dashboard_update_to_sse_outbox();
