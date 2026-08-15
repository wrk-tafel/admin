-- The dashboard's "Personen angemeldet" count is derived from the persons of the registered
-- households (DashboardService.getRegisteredPersons), so editing a household's persons
-- mid-distribution (adding/removing one, toggling exclude_household) has to refresh the dashboard
-- too - the tables triggered so far (see R__00059/R__00097) only cover the distribution's own
-- writes.
CREATE OR REPLACE TRIGGER trigger_dashboard_update_notification
    AFTER INSERT OR UPDATE OR DELETE
    ON persons
    FOR EACH ROW
EXECUTE FUNCTION insert_dashboard_update_to_sse_outbox();
