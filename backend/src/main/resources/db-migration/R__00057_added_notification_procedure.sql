CREATE OR REPLACE FUNCTION notify_channel_with_row_data()
    RETURNS TRIGGER AS
$$
DECLARE
    channelName TEXT;
BEGIN
    PERFORM pg_notify('scanner_result_inserted', row_to_json(NEW)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
