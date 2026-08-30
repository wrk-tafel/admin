-- Converts every `timestamp` (without time zone) column that records a real point-in-time event to
-- `timestamptz`, so what is stored is the event's actual, unambiguous UTC instant rather than a
-- Europe/Vienna wall-clock string with no zone attached that every reader has to trust by
-- convention. See ADR-0054 for why, and how this keeps every existing display path (PDFs, mails,
-- CSV, the frontend) working unchanged.
--
-- Existing values are reinterpreted as Europe/Vienna wall-clock time - what the application always
-- meant when it wrote them, since the JVM's default zone is pinned to Europe/Vienna everywhere this
-- image runs (ADR-0027) - and converted to the equivalent UTC instant, which Postgres stores
-- internally regardless of the column's declared type.
--
-- Kept out of this conversion:
--   - flyway_schema_history.installed_on: Flyway's own bookkeeping table, not ours to alter - and
--     Flyway holds a lock on it for the whole duration of a migration run, so touching it from
--     inside a migration that same run is executing would deadlock the migration against itself.
--   - shedlock.lock_until / shedlock.locked_at: the lock provider is configured `usingDbTime()`
--     (see SchedulerLockConfig, ADR-0047) specifically so a lock is written and compared entirely by
--     the database's own clock and no application instance's clock can extend or steal it - giving
--     that table a zone would not change its correctness, and R__00100_shedlock.sql already
--     documents "timestamp without a zone" as deliberate.
--
-- Written as a loop over information_schema rather than one ALTER per column so that a future
-- `timestamp` column added without a zone is caught - and fixed - by the next run of this same
-- repeatable migration, instead of quietly reintroducing this gap. Idempotent: once a column is
-- `timestamptz` it no longer matches the filter below, so re-running this script is a no-op.
--
-- `distributions.started_at` needs one extra step around the loop. R__00066 indexed
-- `date(started_at)` to make the statistics queries' `DATE(d.started_at) BETWEEN ...` filters
-- sargable - fine while `started_at` was a naive `timestamp`, where `date()` is IMMUTABLE (a naive
-- value has no zone to resolve). Once it is `timestamptz`, extracting a calendar date depends on
-- which zone you resolve it in, which Postgres can only evaluate as STABLE (the current session's
-- `TimeZone`) - and a STABLE expression cannot back an index, since the index has to mean the same
-- thing to every session that reads it, not just the one that built it. `vienna_date()` below is a
-- thin wrapper that hard-codes Europe/Vienna rather than reading the session's `TimeZone`, so its
-- result no longer depends on which session evaluates it - genuinely immutable for a fixed IANA
-- tzdata, which is what lets it back an index again. StatisticsService.kt's queries call the same
-- function, both so the result matches what `DATE(started_at)` always meant (Vienna, not whatever a
-- future session's `TimeZone` happens to be) and so the planner recognizes the expression as the
-- same one the index is built on.
CREATE OR REPLACE FUNCTION vienna_date(ts timestamptz) RETURNS date
    LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$
SELECT (ts AT TIME ZONE 'Europe/Vienna')::date
$$;

DROP INDEX IF EXISTS idx_distributions_started_at_date;

DO
$$
    DECLARE
        col RECORD;
    BEGIN
        FOR col IN
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND data_type = 'timestamp without time zone'
              AND table_name != 'flyway_schema_history'
              AND NOT (table_name = 'shedlock' AND column_name IN ('lock_until', 'locked_at'))
            LOOP
                EXECUTE format(
                        'ALTER TABLE %I ALTER COLUMN %I TYPE timestamptz USING %I AT TIME ZONE ''Europe/Vienna''',
                        col.table_name, col.column_name, col.column_name
                        );
            END LOOP;
    END
$$;

CREATE INDEX IF NOT EXISTS idx_distributions_started_at_date
    ON distributions (vienna_date(started_at));
