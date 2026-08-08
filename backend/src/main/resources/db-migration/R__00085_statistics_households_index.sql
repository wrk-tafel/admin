-- `households.valid_until` is the column countBeneficiaryCustomers, countBeneficiaryPersons,
-- countBeneficiaryCustomersWithChildren and countSingleParentHouseholds (StatisticsService.kt) all
-- filter on. Those are correlated subqueries evaluated once per timeline bucket, so without an index
-- a yearly-resolution request sequentially scans `households` for every bucket of every one of the
-- ~10 queries a single /api/statistics/data request issues.
-- The join side, `persons(household_id)`, is already covered by idx_persons_household_id (R__00067).
CREATE INDEX IF NOT EXISTS idx_households_valid_until
    ON households (valid_until);
