-- Remove accidental UNIQUE constraints on shelter contacts' name columns
-- These constraints prevent multiple contacts with same firstname/lastname across all shelters.
-- Drop them if present.

ALTER TABLE shelters_contacts
    DROP CONSTRAINT IF EXISTS shelters_contacts_firstname_key;

ALTER TABLE shelters_contacts
    DROP CONSTRAINT IF EXISTS shelters_contacts_lastname_key;
