-- `PersonRepository.countPersonsByCountry` (CountryService.listCountries, issue #3540) groups every
-- person by `country_id` to rank the nationality autocomplete's "frequently used" countries, on
-- every load of the customer create/edit form. A foreign key does not imply an index in Postgres,
-- so without one that query sequentially scans `persons`.
CREATE INDEX IF NOT EXISTS idx_persons_country_id
    ON persons (country_id);
