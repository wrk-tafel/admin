-- A country is identified by its name alone: nothing outside the countries admin screen ever read the
-- two-letter code (not the nationality autocomplete, not a PDF or export, not the statistics), and
-- keeping it meant researching a correct ISO 3166-1 alpha-2 value for every country an administrator
-- adds. Dropping the column takes its unique index (uix_code, R__00002) with it. R__00002 itself stays
-- as released and still creates and fills the column on an empty database, which this then removes.
alter table static_countries
    drop column if exists code;
