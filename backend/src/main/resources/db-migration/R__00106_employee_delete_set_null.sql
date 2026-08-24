-- Employees are personal data and must always be deletable (#2867). The columns below already
-- allow null - only the FK behavior changes, from the default RESTRICT (blocking the delete with a
-- raw DB error) to SET NULL, so a delete always succeeds and the reference is simply cleared. The
-- application then shows "Mitarbeiter gelöscht" wherever such a now-empty reference is displayed.
-- users.employee_id is deliberately left alone: it is NOT NULL and is the identity data backing a
-- login account (personnel number/first/last name have no separate storage on users), so
-- EmployeeService.deleteEmployee still blocks deletion while a user account is linked.

alter table households
    drop constraint households_employee_id_fkey;

alter table households
    add foreign key (employee_id) references employees (id)
        on delete set null;

-- household_notes was renamed from customers_notes in R__00067 - a table rename does not rename its
-- constraints, so the FK Postgres auto-named when the column was added in R__00035 is still called
-- customers_notes_employee_id_fkey.
alter table household_notes
    drop constraint customers_notes_employee_id_fkey;

alter table household_notes
    add foreign key (employee_id) references employees (id)
        on delete set null;

alter table food_collections
    drop constraint food_collections_driver_employee_id_fkey;

alter table food_collections
    add foreign key (driver_employee_id) references employees (id)
        on delete set null;

alter table food_collections
    drop constraint food_collections_co_driver_employee_id_fkey;

alter table food_collections
    add foreign key (co_driver_employee_id) references employees (id)
        on delete set null;
