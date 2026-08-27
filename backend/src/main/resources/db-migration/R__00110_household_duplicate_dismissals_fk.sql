-- R__00102 deliberately left household_duplicate_dismissals without a foreign key, reasoning that a
-- dismissal outliving a deleted household is inert (it can never match a pair again) rather than a
-- dangling reference. That is true for the duplicate-matching logic, but it is still a customer's
-- data sitting in the database with no purpose once the household is gone (#3424) - so this adds the
-- foreign keys after all, with `on delete cascade` taking over the explicit purge that used to live
-- in HouseholdService.deleteHouseholdByHouseholdId.
--
-- households.household_id (the business number, not the JPA primary key) is what this table's
-- columns store, and it already carries a unique index (households_household_id_key, R__00067), so
-- it can be an FK target directly.
--
-- Any row already orphaned by the exact gap this migration closes would violate the constraint the
-- moment it is added, so those are deleted first.
delete from household_duplicate_dismissals
where household_id_low not in (select household_id from households)
   or household_id_high not in (select household_id from households);

alter table household_duplicate_dismissals
    add constraint household_duplicate_dismissals_household_id_low_fkey
        foreign key (household_id_low) references households (household_id)
            on delete cascade;

alter table household_duplicate_dismissals
    add constraint household_duplicate_dismissals_household_id_high_fkey
        foreign key (household_id_high) references households (household_id)
            on delete cascade;
