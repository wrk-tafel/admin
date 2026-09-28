-- A lock without a locked_until date has no end, so nothing ever asks whether it is still needed
-- (GDPR Art. 5(1)(e), issue #3763). lock_reviewed_at/lock_reviewed_by record the last time a staff
-- member confirmed such a lock should stay; the review interval restarts from there (or from
-- locked_at while the lock has never been reviewed). Both are cleared together with the rest of the
-- lock when the household is unlocked.

alter table households add column if not exists lock_reviewed_at timestamp;
alter table households add column if not exists lock_reviewed_by bigint references users (id) on delete set null;
