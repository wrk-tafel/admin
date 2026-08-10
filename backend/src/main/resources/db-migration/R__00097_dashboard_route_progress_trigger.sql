-- The dashboard's route progress panel reads routes_stops_completions, so a driver ticking a stop
-- off has to wake the dashboard's SSE stream the same way every other panel's source table does
-- (see R__00059, which installs the function and the triggers for the other tables).
CREATE OR REPLACE TRIGGER trigger_dashboard_update_notification
    AFTER INSERT OR UPDATE OR DELETE
    ON routes_stops_completions
    FOR EACH ROW
EXECUTE FUNCTION insert_dashboard_update_to_sse_outbox();
