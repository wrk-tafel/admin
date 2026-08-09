-- Enforces at the database level what the customer form and the Bean Validation annotations on
-- `HouseholdAddress` already require: a household has a street, a house number, a postal code and
-- a city, and the single-parent flag is a yes/no rather than a maybe.
--
-- These columns were nullable because the 2023 import could not supply the values. That data has
-- been cleaned up, but a residue remains that cannot be reconstructed - a handful of households
-- whose stored address was never more than a note ("Ohne Wohnsitz", "P7", a surname) and whose
-- validity ran out between 2011 and 2022. Deleting them would throw away real distribution history
-- and inventing addresses for them is worse than leaving them incomplete.
--
-- Hence two levels of enforcement:
--
--   * `set not null` for the columns with no violating row at all.
--   * `check (...) not valid` for the rest. Postgres does not scan the existing rows when such a
--     constraint is added, but it does enforce it on every insert and update from then on - which
--     is the guarantee wanted, from a migration that cannot refuse to apply. That matters here:
--     Flyway runs on application boot, so a constraint that fails to apply stops the deployment
--     rather than just failing a script.
--
-- Once the remaining households have been completed by hand, promote the checks with:
--
--   alter table households validate constraint households_address_housenumber_present;
--   alter table households validate constraint households_address_postalcode_present;
--   alter table households validate constraint households_address_city_present;
--
-- What is still outstanding can be listed with:
--
--   select household_id, address_street, valid_until
--   from households
--   where nullif(trim(address_housenumber), '') is null
--      or address_postalcode is null
--      or nullif(trim(address_city), '') is null;

-- --------------------------------------------------------------------------------------------
-- fully enforced: no violating row exists
-- --------------------------------------------------------------------------------------------
alter table if exists households
    alter column address_street set not null;

-- `single_parent` is a checkbox, so it is always either true or false. R__00077 backfilled the
-- historical rows; the default stops any writer that does not set it explicitly from
-- re-introducing nulls.
update households set single_parent = false where single_parent is null;
alter table if exists households
    alter column single_parent set default false;
alter table if exists households
    alter column single_parent set not null;

-- --------------------------------------------------------------------------------------------
-- enforced for new and updated rows only - see the header for the rows this tolerates
-- --------------------------------------------------------------------------------------------
alter table if exists households
    drop constraint if exists households_address_housenumber_present;
alter table if exists households
    add constraint households_address_housenumber_present
        check (nullif(trim(address_housenumber), '') is not null) not valid;

alter table if exists households
    drop constraint if exists households_address_postalcode_present;
alter table if exists households
    add constraint households_address_postalcode_present
        check (address_postalcode is not null) not valid;

alter table if exists households
    drop constraint if exists households_address_city_present;
alter table if exists households
    add constraint households_address_city_present
        check (nullif(trim(address_city), '') is not null) not valid;

-- --------------------------------------------------------------------------------------------
-- deliberately NOT enforced
-- --------------------------------------------------------------------------------------------
-- `persons.firstname` / `lastname` / `birth_date` / `gender`: the form requires all four, but an
-- incomplete person is a state the application supports on purpose. It is what
-- `HouseholdEntity.Specs.postProcessingNecessary()` searches for and what the "Daten
-- unvollständig" filter in the customer search exists to surface, and both the integration tests
-- in `HouseholdEntitySpecsIT` and the `testdata` fixtures create such rows to exercise it. A
-- column constraint would take that capability away.
--
-- `persons.employer`: required for the main person only, never for the other members of a
-- household, so it cannot be expressed as a column constraint.
--
-- `households.telephone_number`: only the frontend treats it as mandatory - `HouseholdRequest`
-- carries no validation for it, and 69% of the households on record have none (all of them long
-- expired). Enforcing it in the schema would contradict the API contract.
