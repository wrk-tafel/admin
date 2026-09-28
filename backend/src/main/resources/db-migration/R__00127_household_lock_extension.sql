-- Extends a household lock (issue #3753): lock_reason_type is a selectable reason category
-- (HouseholdLockReason) instead of only the free-text lock_reason, and locked_until lets a lock carry
-- an expiration date - HouseholdLockExpiryService lifts the lock automatically once that date has
-- passed. Both are optional: null means a permanent lock with only a free-text reason, same as before.

alter table households add column if not exists lock_reason_type varchar(50);
alter table households add column if not exists locked_until date;
