-- ShedLock's lock table: one row per scheduled job that must run once per cluster rather than once
-- per instance (see SchedulerLockConfig and ADR-0047). Only the jobs with no rows of their own to
-- claim are in here - the retention cleanups coordinate through FOR UPDATE SKIP LOCKED on the rows
-- they are deleting, and need no entry.
--
-- The shape is ShedLock's own; `name` is the job's lock name and the primary key, which is what
-- makes an instance's attempt to take a lock somebody else holds a no-op instead of a second run.
-- No `_seq` sequence: nothing here is a JPA entity, and the key is the name rather than a generated
-- id. `timestamp` without a zone because the provider is configured with `usingDbTime()` - every
-- value is written and compared by the database's own clock, so a node whose clock drifts cannot
-- extend or steal a lock.
create table if not exists shedlock
(
    name       varchar(64)  not null
        primary key,
    lock_until timestamp    not null,
    locked_at  timestamp    not null,
    locked_by  varchar(255) not null
);
