-- `households.single_parent` is a checkbox on the customer form, so it is always either true or
-- false - "unknown" was never a meaningful third state. It was added nullable by R__00076 purely so
-- that R__00077 could backfill the existing rows afterwards.
--
-- The default is what makes the column safe to tighten: several inserts (the testdata fixtures
-- among them) leave it out entirely, and without a default those would start failing.
--
-- Note that the other fields the customer form marks required - the address parts, and a person's
-- name, birth date and gender - are deliberately *not* constrained here. An incomplete household or
-- person is a state this application supports on purpose: it is what
-- `HouseholdEntity.Specs.postProcessingNecessary()` searches for, what the "Daten unvollständig"
-- filter in the customer search exists to surface, and what the 2023 import left behind in rows
-- that cannot be reconstructed. `testdata.sql` seeds household 106 with no address and persons
-- without names or birth dates precisely to exercise that filter, and `HouseholdEntitySpecsIT`
-- persists the same shape. A column constraint would make those rows impossible to create and take
-- the capability away. `HouseholdRequiredFieldsIT` locks that decision down.

update households set single_parent = false where single_parent is null;

alter table if exists households
    alter column single_parent set default false;
alter table if exists households
    alter column single_parent set not null;
