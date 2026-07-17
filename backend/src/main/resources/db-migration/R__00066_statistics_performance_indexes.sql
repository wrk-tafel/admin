-- The statistics page runs several correlated subqueries (see StatisticsService.kt) per timeline bucket,
-- filtering/joining on these columns. None of them were indexed, so every query does a sequential scan -
-- fine with the small local/test datasets but increasingly slow in prod as history accumulates.

CREATE INDEX IF NOT EXISTS idx_customers_valid_until
    ON customers (valid_until);

CREATE INDEX IF NOT EXISTS idx_customers_addpersons_customer_id
    ON customers_addpersons (customer_id);

-- Matches the exact `DATE(started_at)` expression used in the statistics queries' WHERE clauses,
-- since a plain index on started_at can't be used by the planner for that wrapped expression.
CREATE INDEX IF NOT EXISTS idx_distributions_started_at_date
    ON distributions (date(started_at));

CREATE INDEX IF NOT EXISTS idx_distributions_statistics_distribution_id
    ON distributions_statistics (distribution_id);

CREATE INDEX IF NOT EXISTS idx_distributions_statistics_shelters_distribution_statistic_id
    ON distributions_statistics_shelters (distribution_statistic_id);

CREATE INDEX IF NOT EXISTS idx_food_collections_items_food_collection_id
    ON food_collections_items (food_collection_id);
