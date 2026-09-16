-- R__00119 backfilled persons.duplicate_name_key for every row and built
-- idx_persons_duplicate_name_key on soundex(duplicate_name_key), but never told the planner about
-- either: a bulk UPDATE touching every row leaves the table's statistics (and the new column's, and
-- the new functional index's) as stale as they were before the column existed, until autovacuum's
-- analyze threshold (10% of the table + 50 rows by default) happens to fire on its own schedule.
-- HouseholdDuplicationService's self-join depends entirely on the planner's join-selectivity
-- estimate for soundex(duplicate_name_key) = soundex(duplicate_name_key) to pick a sane plan, so a
-- query run against stale stats right after this deploy can end up slower than the multi-second load
-- R__00119 set out to fix, not faster - see the `HouseholdDuplicationService` README section.
analyze persons;
