-- adapt sequences
SELECT setval('household_id_sequence', 10000, false);
SELECT setval('employees_seq', 10000, false);
SELECT setval('users_seq', 10000, false);
SELECT setval('users_authorities_seq', 10000, false);
SELECT setval('households_seq', 10000, false);
SELECT setval('persons_seq', 10000, false);
SELECT setval('household_notes_seq', 10000, false);
SELECT setval('static_values_seq', 10000, false);
SELECT setval('distributions_seq', 10000, false);
SELECT setval('distributions_statistics_seq', 10000, false);
SELECT setval('distributions_households_seq', 10000, false);
SELECT setval('shops_seq', 10000, false);
SELECT setval('routes_seq', 10000, false);
SELECT setval('routes_stops_seq', 10000, false);
SELECT setval('food_categories_seq', 10000, false);
SELECT setval('food_return_categories_seq', 10000, false);
SELECT setval('cars_seq', 10000, false);
SELECT setval('food_collections_seq', 10000, false);
SELECT setval('shelters_seq', 10000, false);
SELECT setval('shelters_contacts_seq', 10000, false);
SELECT setval('distributions_statistics_shelters_seq', 10000, false);
SELECT setval('mail_recipients_seq', 10000, false);
SELECT setval('login_attempts_seq', 10000, false);
SELECT setval('audit_log_seq', 10000, false);

-- user e2etest for cypress tests
-- pwd: e2etest
INSERT INTO employees (id, created_at, updated_at, personnel_number, firstname, lastname)
VALUES (100, NOW(), NOW(), '00000', 'E2E', 'Test');
INSERT INTO users (id, created_at, updated_at, username, password, enabled, employee_id)
VALUES (100, NOW(), NOW(), 'e2etest',
        '{argon2}$argon2id$v=19$m=4096,t=3,p=1$Cnj0ayQKhOPbkomIRV5tnQ$BfU/uOr20/vg9ie0CQcWhCD00DqjPDf6UI0pRvz1/gg',
        true, 100);
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (1001, NOW(), NOW(), 100, 'CUSTOMER');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (1002, NOW(), NOW(), 100, 'SCANNER');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (1003, NOW(), NOW(), 100, 'CHECKIN');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (1004, NOW(), NOW(), 100, 'DISTRIBUTION_LCM');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (1005, NOW(), NOW(), 100, 'USER_MANAGEMENT');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (1006, NOW(), NOW(), 100, 'CUSTOMER_DUPLICATES');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (1007, NOW(), NOW(), 100, 'LOGISTICS');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (1008, NOW(), NOW(), 100, 'SETTINGS');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (1009, NOW(), NOW(), 100, 'STATISTICS');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (1010, NOW(), NOW(), 100, 'SUPERVISOR');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (1011, NOW(), NOW(), 100, 'CUSTOMERS_ABOVE_LIMIT');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (1012, NOW(), NOW(), 100, 'CUSTOMERS_OVERVIEW');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (1013, NOW(), NOW(), 100, 'ADMINISTRATOR');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (1014, NOW(), NOW(), 100, 'AUDIT_LOG');

-- user: testuser
-- pwd: 35bc40681124f412c5d052366edb9eb9
INSERT INTO employees (id, created_at, updated_at, personnel_number, firstname, lastname)
VALUES (200, NOW(), NOW(), '0200', 'Test', 'User');
INSERT INTO users (id, created_at, updated_at, username, password, enabled, employee_id)
VALUES (200, NOW(), NOW(), 'testuser',
        '{argon2}$argon2id$v=19$m=4096,t=3,p=1$DZTJhKdC4/5fzGDI2CtozA$ELfBRSqAKes7ThqkzL7AN6JkEq7wzWgKejhLQ02XD6c',
        true, 200);
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (2001, NOW(), NOW(), 200, 'CUSTOMER');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (2002, NOW(), NOW(), 200, 'SCANNER');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (2003, NOW(), NOW(), 200, 'CHECKIN');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (2004, NOW(), NOW(), 200, 'DISTRIBUTION_LCM');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (2005, NOW(), NOW(), 200, 'CUSTOMER_DUPLICATES');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (2006, NOW(), NOW(), 200, 'CUSTOMERS_ABOVE_LIMIT');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (2007, NOW(), NOW(), 200, 'CUSTOMERS_OVERVIEW');

-- user: admin
-- pwd: 12345
INSERT INTO employees (id, created_at, updated_at, personnel_number, firstname, lastname)
VALUES (300, NOW(), NOW(), 'admin-persnr', 'AD', 'min');
INSERT INTO users (id, created_at, updated_at, username, password, enabled, employee_id)
VALUES (300, NOW(), NOW(), 'admin',
        '{argon2}$argon2id$v=19$m=4096,t=3,p=1$RXn6Xt/0q/Wtrvdns6NUnw$X3xWUjENAbNSJNckeVFXWrjkoFSowwlu3xHx1/zb40w',
        true, 300);
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (3001, NOW(), NOW(), 300, 'CUSTOMER');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (3002, NOW(), NOW(), 300, 'SCANNER');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (3003, NOW(), NOW(), 300, 'CHECKIN');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (3004, NOW(), NOW(), 300, 'DISTRIBUTION_LCM');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (3005, NOW(), NOW(), 300, 'USER_MANAGEMENT');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (3006, NOW(), NOW(), 300, 'CUSTOMER_DUPLICATES');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (3007, NOW(), NOW(), 300, 'LOGISTICS');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (3008, NOW(), NOW(), 300, 'SETTINGS');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (3009, NOW(), NOW(), 300, 'STATISTICS');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (3010, NOW(), NOW(), 300, 'SUPERVISOR');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (3011, NOW(), NOW(), 300, 'CUSTOMERS_ABOVE_LIMIT');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (3012, NOW(), NOW(), 300, 'CUSTOMERS_OVERVIEW');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (3013, NOW(), NOW(), 300, 'ADMINISTRATOR');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (3014, NOW(), NOW(), 300, 'AUDIT_LOG');

-- user: scanner1
-- pwd: 12345
INSERT INTO employees (id, created_at, updated_at, personnel_number, firstname, lastname)
VALUES (400, NOW(), NOW(), '0400', 'Scanner', '1');
INSERT INTO users (id, created_at, updated_at, username, password, enabled, employee_id)
VALUES (400, NOW(), NOW(), 'scanner1',
        '{argon2}$argon2id$v=19$m=4096,t=3,p=1$RXn6Xt/0q/Wtrvdns6NUnw$X3xWUjENAbNSJNckeVFXWrjkoFSowwlu3xHx1/zb40w',
        true, 400);
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (4001, NOW(), NOW(), 400, 'SCANNER');

-- user: scanner2
-- pwd: 12345
INSERT INTO employees (id, created_at, updated_at, personnel_number, firstname, lastname)
VALUES (500, NOW(), NOW(), '0500', 'Scanner', '2');
INSERT INTO users (id, created_at, updated_at, username, password, enabled, employee_id)
VALUES (500, NOW(), NOW(), 'scanner2',
        '{argon2}$argon2id$v=19$m=4096,t=3,p=1$RXn6Xt/0q/Wtrvdns6NUnw$X3xWUjENAbNSJNckeVFXWrjkoFSowwlu3xHx1/zb40w',
        true, 500);
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (5001, NOW(), NOW(), 500, 'SCANNER');

-- user: disabled1
-- pwd: 12345
INSERT INTO employees (id, created_at, updated_at, personnel_number, firstname, lastname)
VALUES (600, NOW(), NOW(), '0600', 'Disabled', '1');
INSERT INTO users (id, created_at, updated_at, username, password, enabled, employee_id)
VALUES (600, NOW(), NOW(), 'disabled1',
        '{argon2}$argon2id$v=19$m=4096,t=3,p=1$RXn6Xt/0q/Wtrvdns6NUnw$X3xWUjENAbNSJNckeVFXWrjkoFSowwlu3xHx1/zb40w',
        false, 600);

-- user: checkin1
-- pwd: 12345
INSERT INTO employees (id, created_at, updated_at, personnel_number, firstname, lastname)
VALUES (700, NOW(), NOW(), '0700', 'Checkin', '1');
INSERT INTO users (id, created_at, updated_at, username, password, enabled, employee_id)
VALUES (700, NOW(), NOW(), 'checkin1',
        '{argon2}$argon2id$v=19$m=4096,t=3,p=1$RXn6Xt/0q/Wtrvdns6NUnw$X3xWUjENAbNSJNckeVFXWrjkoFSowwlu3xHx1/zb40w',
        true, 700);
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (7001, NOW(), NOW(), 700, 'CHECKIN');

-- user e2etest2 for cypress tests
-- pwd: e2etest
INSERT INTO employees (id, created_at, updated_at, personnel_number, firstname, lastname)
VALUES (800, NOW(), NOW(), '0800', 'E2E', 'Test 2');
INSERT INTO users (id, created_at, updated_at, username, password, enabled, employee_id)
VALUES (800, NOW(), NOW(), 'e2etest2',
        '{argon2}$argon2id$v=19$m=4096,t=3,p=1$Cnj0ayQKhOPbkomIRV5tnQ$BfU/uOr20/vg9ie0CQcWhCD00DqjPDf6UI0pRvz1/gg',
        true, 800);
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (8001, NOW(), NOW(), 800, 'CUSTOMER');

-- households + persons
--
-- Every household is written in two steps: the household row first (main_person_id = null), then
-- its persons, then an UPDATE that sets main_person_id. households and persons reference each
-- other, so neither row can carry a non-null pointer to the other on first insert. The main person
-- reuses the household's own id - the same convention the R__00067 data migration uses.
INSERT INTO households (id, created_at, updated_at, household_id, employee_id, main_person_id,
                        address_street, address_housenumber, address_stairway, address_door, address_postalcode,
                        address_city, telephone_number, email, valid_until, pending_cost_contribution)
values (100, NOW(), NOW(), 100, 100, null, 'Erdberg', 1, null, null,
        '1030', 'Wien', '00436645678953', 'max.single.mustermann@wrk.at', '2999-12-31', 25);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, employer, income, income_due, exclude_household, receives_family_allowance)
values (100, NOW(), NOW(), 100, true, 'Max Single', 'Mustermann', '1980-01-01', 'MALE', 1, 'Stadt Wien', 123.00,
        '2999-12-31', false, false);
UPDATE households SET main_person_id = 100 WHERE id = 100;

INSERT INTO households (id, created_at, updated_at, household_id, employee_id, main_person_id,
                        address_street, address_housenumber, address_stairway, address_door, address_postalcode,
                        address_city, telephone_number, email, valid_until, pending_cost_contribution, single_parent)
values (101, NOW(), NOW(), 101, 100, null, 'Erdberg', 2, '1', '20', '1010',
        'Wien', '00436645678953', 'eva.musterfrau@wrk.at', '2999-12-31', 0, true);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, employer, income, income_due, exclude_household, receives_family_allowance)
values (101, NOW(), NOW(), 101, true, 'Eva', 'Musterfrau', '1990-01-01', 'FEMALE', 2, 'Rotes Kreuz Wien', 456.00,
        '2999-12-31', false, false);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     income, income_due, country_id, receives_family_allowance)
values (1011, NOW(), NOW(), 101, false, 'Kind 1', 'Musterfrau', '2000-01-01', 'FEMALE', 500, '2999-12-31', 1, false);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     employer, income, income_due, country_id, receives_family_allowance)
values (1012, NOW(), NOW(), 101, false, 'Kind 2', 'Musterfrau', CURRENT_DATE - interval '2 year', 'FEMALE',
        'Stadt Wien', null, null, 1,
        true);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     employer, income, income_due, country_id, receives_family_allowance, exclude_household)
values (1013, NOW(), NOW(), 101, false, 'Kind 3', 'Musterfrau', CURRENT_DATE - interval '2 year', 'MALE', 'WRK', null,
        null, 1, true,
        true);
UPDATE households SET main_person_id = 101 WHERE id = 101;

INSERT INTO household_notes (id, created_at, updated_at, household_id, employee_id, note)
VALUES (1003, NOW(), NOW(), 101, 100,
        E'Testnotiz 3.\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.\n\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO household_notes (id, created_at, updated_at, household_id, employee_id, note)
VALUES (1002, NOW(), NOW(), 101, 100, 'Testnotiz 2');
INSERT INTO household_notes (id, created_at, updated_at, household_id, employee_id, note)
VALUES (1001, NOW(), NOW(), 101, null, 'Testnotiz 1');

INSERT INTO households (id, created_at, updated_at, household_id, employee_id, main_person_id,
                        address_street, address_housenumber, address_stairway, address_door, address_postalcode,
                        address_city, telephone_number, email, valid_until, pending_cost_contribution)
values (102, NOW(), NOW(), 102, 100, null, 'Erdberg', 1, null, null, '1030', 'Wien',
        '00436645678953', 'herbert.wagner@wrk.at', '2999-12-31', 0);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, employer, income, income_due, exclude_household, receives_family_allowance)
values (102, NOW(), NOW(), 102, true, 'Herbert', 'Wagner', '1980-01-01', 'MALE', 1, 'Stadt Wien', 123.00, '2999-12-31',
        false, false);
UPDATE households SET main_person_id = 102 WHERE id = 102;

INSERT INTO households (id, created_at, updated_at, household_id, employee_id, main_person_id,
                        address_street, address_housenumber, address_stairway, address_door, address_postalcode,
                        address_city, telephone_number, email, valid_until, pending_cost_contribution, single_parent)
values (103, NOW(), NOW(), 103, 100, null, 'Erdberg', 1, null, null,
        '1030', 'Wien', null, null, NOW() + interval '1 month', 0, true);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, employer, income, income_due, exclude_household, receives_family_allowance)
values (103, NOW(), NOW(), 103, true, 'Erika', 'LÄUFT BALD AB', '1980-01-01', 'FEMALE', 1, 'Stadt Wien', 123.00,
        NOW() + interval '1 month', false, false);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     income, income_due, country_id, receives_family_allowance)
values (1031, NOW(), NOW(), 103, false, 'Kind 1', 'Musterfrau', CURRENT_DATE - interval '1 year', null, 500, '2999-12-31', 1, false);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     employer, income, income_due, country_id, receives_family_allowance)
values (1032, NOW(), NOW(), 103, false, 'Kind 2', 'Musterfrau', CURRENT_DATE - interval '2 year', null, 'Stadt Wien', null, null, 1, true);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     employer, income, income_due, country_id, receives_family_allowance, exclude_household)
values (1033, NOW(), NOW(), 103, false, 'Kind 3', 'Musterfrau', CURRENT_DATE - interval '3 year', 'FEMALE', 'WRK', null, null, 1, true, true);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     employer, income, income_due, country_id, receives_family_allowance, exclude_household)
values (1034, NOW(), NOW(), 103, false, 'Kind 4', 'Musterfrau', CURRENT_DATE - interval '4 year', 'FEMALE', 'WRK', null, null, 1, true, true);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     employer, income, income_due, country_id, receives_family_allowance, exclude_household)
values (1035, NOW(), NOW(), 103, false, 'Kind 5', 'Musterfrau', CURRENT_DATE - interval '5 year', 'MALE', 'WRK', null, null, 1, true, true);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     employer, income, income_due, country_id, receives_family_allowance, exclude_household)
values (1036, NOW(), NOW(), 103, false, 'Kind 6', 'Musterfrau', CURRENT_DATE - interval '6 year', 'MALE', 'WRK', null, null, 1, true, true);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     employer, income, income_due, country_id, receives_family_allowance, exclude_household)
values (1037, NOW(), NOW(), 103, false, 'Kind 7', 'Musterfrau', CURRENT_DATE - interval '7 year', 'MALE', 'WRK', null, null, 1, true, true);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     employer, income, income_due, country_id, receives_family_allowance, exclude_household)
values (1038, NOW(), NOW(), 103, false, 'Kind 8', 'Musterfrau', CURRENT_DATE - interval '8 year', 'MALE', 'WRK', null, null, 1, true, true);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     employer, income, income_due, country_id, receives_family_allowance, exclude_household)
values (1039, NOW(), NOW(), 103, false, 'Kind 9', 'Musterfrau', CURRENT_DATE - interval '9 year', 'MALE', 'WRK', null, null, 1, true, true);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     employer, income, income_due, country_id, receives_family_allowance, exclude_household)
values (1040, NOW(), NOW(), 103, false, 'Kind 10', 'Musterfrau', CURRENT_DATE - interval '10 year', 'MALE', 'WRK', null, null, 1, true, true);
UPDATE households SET main_person_id = 103 WHERE id = 103;

INSERT INTO household_notes (id, created_at, updated_at, household_id, employee_id, note)
VALUES (1041, NOW(), NOW(), 103, 100,
        E'Testnotiz 1.\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.\n\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO household_notes (id, created_at, updated_at, household_id, employee_id, note)
VALUES (1042, NOW(), NOW(), 103, 100,
        E'Testnotiz 2.\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.\n\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO household_notes (id, created_at, updated_at, household_id, employee_id, note)
VALUES (1043, NOW(), NOW(), 103, 100,
        E'Testnotiz 3.\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.\n\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO household_notes (id, created_at, updated_at, household_id, employee_id, note)
VALUES (1044, NOW(), NOW(), 103, 100,
        E'Testnotiz 4.\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.\n\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO household_notes (id, created_at, updated_at, household_id, employee_id, note)
VALUES (1045, NOW(), NOW(), 103, 100,
        E'Testnotiz 5.\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.\n\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO household_notes (id, created_at, updated_at, household_id, employee_id, note)
VALUES (1046, NOW(), NOW(), 103, 100,
        E'Testnotiz 6.\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.\n\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO household_notes (id, created_at, updated_at, household_id, employee_id, note)
VALUES (1047, NOW(), NOW(), 103, 100,
        E'Testnotiz 7.\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.\n\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO household_notes (id, created_at, updated_at, household_id, employee_id, note)
VALUES (1048, NOW(), NOW(), 103, 100,
        E'Testnotiz 8.\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.\n\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO household_notes (id, created_at, updated_at, household_id, employee_id, note)
VALUES (1049, NOW(), NOW(), 103, 100,
        E'Testnotiz 9.\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.\n\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO household_notes (id, created_at, updated_at, household_id, employee_id, note)
VALUES (1050, NOW(), NOW(), 103, 100,
        E'Testnotiz 10.\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.\n\nLorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');

INSERT INTO households (id, created_at, updated_at, household_id, employee_id, main_person_id,
                        address_street, address_housenumber, address_stairway, address_door, address_postalcode,
                        address_city, telephone_number, email, valid_until, pending_cost_contribution)
values (104, NOW(), NOW(), 104, 100, null, 'Erdberg', 1, null, null, '1030',
        'Wien', null, null, '2000-12-31', 0);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, employer, income, income_due, exclude_household, receives_family_allowance)
values (104, NOW(), NOW(), 104, true, 'Herta', 'ABGELAUFEN', '1980-01-01', 'FEMALE', 1, 'Stadt Wien', 123.00,
        '2000-12-31', false, false);
UPDATE households SET main_person_id = 104 WHERE id = 104;

INSERT INTO households (id, created_at, updated_at, household_id, employee_id, main_person_id,
                        address_street, address_housenumber, address_stairway, address_door, address_postalcode,
                        address_city, telephone_number, email, valid_until, locked,
                        locked_at, locked_by, lock_reason, pending_cost_contribution)
values (105, NOW(), NOW(), 105, 100, null, 'Erdberg', 1, null, null, '1030',
        'Wien', null, null, '2999-12-31', true, NOW(), 100, 'Sperrgrund: Lorem ipsum dolor sit amet', 0);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, employer, income, income_due, exclude_household, receives_family_allowance)
values (105, NOW(), NOW(), 105, true, 'Grete', 'GESPERRT', '1980-01-01', 'FEMALE', 1, 'Stadt Wien', 123.00,
        '2999-12-31', false, false);
UPDATE households SET main_person_id = 105 WHERE id = 105;

-- household with (mostly) missing master data - shows up in the "Nachbearbeitung" search filter
INSERT INTO households (id, created_at, updated_at, household_id, employee_id, main_person_id,
                        address_street, address_housenumber, address_stairway, address_door, address_postalcode,
                        address_city, telephone_number, email, valid_until, locked,
                        locked_at, locked_by, lock_reason, pending_cost_contribution)
values (106, NOW(), NOW(), 106, null, null, null, null, null, null, null,
        null, null, null, NOW(), false, null, null, null, 0);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, employer, income, income_due, exclude_household, receives_family_allowance)
values (106, NOW(), NOW(), 106, true, null, null, null, null, 1, null, null, null, false, false);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     employer,
                     income, income_due, country_id, receives_family_allowance, exclude_household)
values (1060, NOW(), NOW(), 106, false, 'Vorname 1', 'Nachname 1', null, null, null, null, null, 1, true, true);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     employer,
                     income, income_due, country_id, receives_family_allowance, exclude_household)
values (1061, NOW(), NOW(), 106, false, 'Vorname 2', 'Nachname 2', null, null, null, null, null, 1, false, false);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     employer,
                     income, income_due, country_id, receives_family_allowance, exclude_household)
values (1062, NOW(), NOW(), 106, false, 'Vorname 3', 'Nachname 3', null, null, null, null, null, 1, true, false);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     employer,
                     income, income_due, country_id, receives_family_allowance, exclude_household)
values (1063, NOW(), NOW(), 106, false, 'Vorname 4', 'Nachname 4', null, null, null, null, null, 1, false, true);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     employer,
                     income, income_due, country_id, receives_family_allowance, exclude_household)
values (1064, NOW(), NOW(), 106, false, 'Vorname 5', 'Nachname 5', null, null, null, null, null, 1, false, false);
UPDATE households SET main_person_id = 106 WHERE id = 106;

-- household above the income limit (couple, 2 children) - complete master data, shows up in
-- "Kunden über Limit": income 2200+1600=3800 vs. limit 2788.00 for 2 adults/2 children
INSERT INTO households (id, created_at, updated_at, household_id, employee_id, main_person_id,
                        address_street, address_housenumber, address_stairway, address_door, address_postalcode,
                        address_city, telephone_number, email, valid_until, pending_cost_contribution)
values (110, NOW(), NOW(), 110, 100, null, 'Teststraße', '10', null, null,
        '1030', 'Wien', '0043660111000', 'ueberlimit.paar@wrk.at', '2999-12-31', 0);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, employer, income, income_due, exclude_household, receives_family_allowance)
values (110, NOW(), NOW(), 110, true, 'Anna', 'Vielverdiener', '1988-05-10', 'FEMALE', 1, 'Firma A', 2200.00,
        '2999-12-31', false, false);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, employer, income, income_due, exclude_household, receives_family_allowance)
values (1101, NOW(), NOW(), 110, false, 'Peter', 'Vielverdiener', '1985-03-15', 'MALE', 1, 'Firma B', 1600.00,
        '2999-12-31', false, false);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, exclude_household, receives_family_allowance)
values (1102, NOW(), NOW(), 110, false, 'Lisa', 'Vielverdiener', CURRENT_DATE - interval '8 year', 'FEMALE', 1, false, false);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, exclude_household, receives_family_allowance)
values (1103, NOW(), NOW(), 110, false, 'Tom', 'Vielverdiener', CURRENT_DATE - interval '5 year', 'MALE', 1, false, false);
UPDATE households SET main_person_id = 110 WHERE id = 110;

-- household above the income limit (single adult) - complete master data, shows up in
-- "Kunden über Limit": income 2200 vs. limit 1328.00 for 1 adult/0 children
INSERT INTO households (id, created_at, updated_at, household_id, employee_id, main_person_id,
                        address_street, address_housenumber, address_stairway, address_door, address_postalcode,
                        address_city, telephone_number, email, valid_until, pending_cost_contribution)
values (111, NOW(), NOW(), 111, 100, null, 'Teststraße', '11', null, null,
        '1030', 'Wien', '0043660111111', 'ueberlimit.single@wrk.at', '2999-12-31', 0);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, employer, income, income_due, exclude_household, receives_family_allowance)
values (111, NOW(), NOW(), 111, true, 'Sabine', 'Grossverdiener', '1975-11-20', 'FEMALE', 1, 'Firma C', 2200.00,
        '2999-12-31', false, false);
UPDATE households SET main_person_id = 111 WHERE id = 111;

-- customer duplicates - fuzzy name/address matches for the "Kunden-Duplikate" screen
-- (see HouseholdDuplicationService: soundex + levenshtein tolerance on name and address)

-- pair: same address, first-name typo (classic re-registration)
INSERT INTO households (id, created_at, updated_at, household_id, employee_id, main_person_id,
                        address_street, address_housenumber, address_stairway, address_door, address_postalcode,
                        address_city, telephone_number, email, valid_until, pending_cost_contribution)
values (120, NOW(), NOW(), 120, 100, null, 'Hauptstraße', '5', null, null,
        '1030', 'Wien', null, null, '2999-12-31', 0);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, exclude_household, receives_family_allowance)
values (120, NOW(), NOW(), 120, true, 'Maria', 'Huber', '1982-04-12', 'FEMALE', 1, false, false);
UPDATE households SET main_person_id = 120 WHERE id = 120;

INSERT INTO households (id, created_at, updated_at, household_id, employee_id, main_person_id,
                        address_street, address_housenumber, address_stairway, address_door, address_postalcode,
                        address_city, telephone_number, email, valid_until, pending_cost_contribution)
values (121, NOW(), NOW(), 121, 100, null, 'Hauptstraße', '5', null, null,
        '1030', 'Wien', null, null, '2999-12-31', 0);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, exclude_household, receives_family_allowance)
values (121, NOW(), NOW(), 121, true, 'Marie', 'Huber', '1982-04-12', 'FEMALE', 1, false, false);
UPDATE households SET main_person_id = 121 WHERE id = 121;

-- pair: same name, address spelling variant (ß vs ss)
INSERT INTO households (id, created_at, updated_at, household_id, employee_id, main_person_id,
                        address_street, address_housenumber, address_stairway, address_door, address_postalcode,
                        address_city, telephone_number, email, valid_until, pending_cost_contribution)
values (122, NOW(), NOW(), 122, 100, null, 'Wehlistraße', '22', null, null,
        '1020', 'Wien', null, null, '2999-12-31', 0);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, exclude_household, receives_family_allowance)
values (122, NOW(), NOW(), 122, true, 'Thomas', 'Berger', '1975-09-01', 'MALE', 1, false, false);
UPDATE households SET main_person_id = 122 WHERE id = 122;

INSERT INTO households (id, created_at, updated_at, household_id, employee_id, main_person_id,
                        address_street, address_housenumber, address_stairway, address_door, address_postalcode,
                        address_city, telephone_number, email, valid_until, pending_cost_contribution)
values (123, NOW(), NOW(), 123, 100, null, 'Wehlistrasse', '22', null, null,
        '1020', 'Wien', null, null, '2999-12-31', 0);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, exclude_household, receives_family_allowance)
values (123, NOW(), NOW(), 123, true, 'Thomas', 'Berger', '1975-09-01', 'MALE', 1, false, false);
UPDATE households SET main_person_id = 123 WHERE id = 123;

-- three-way cluster: an exact re-entry plus a name/address typo variant, so one household
-- shows two similar households at once
INSERT INTO households (id, created_at, updated_at, household_id, employee_id, main_person_id,
                        address_street, address_housenumber, address_stairway, address_door, address_postalcode,
                        address_city, telephone_number, email, valid_until, pending_cost_contribution)
values (130, NOW(), NOW(), 130, 100, null, 'Praterstraße', '10', null, null,
        '1020', 'Wien', null, null, '2999-12-31', 0);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, exclude_household, receives_family_allowance)
values (130, NOW(), NOW(), 130, true, 'Anna', 'Fischer', '1990-06-20', 'FEMALE', 1, false, false);
UPDATE households SET main_person_id = 130 WHERE id = 130;

INSERT INTO households (id, created_at, updated_at, household_id, employee_id, main_person_id,
                        address_street, address_housenumber, address_stairway, address_door, address_postalcode,
                        address_city, telephone_number, email, valid_until, pending_cost_contribution)
values (131, NOW(), NOW(), 131, 100, null, 'Praterstraße', '10', null, null,
        '1020', 'Wien', null, null, '2999-12-31', 0);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, exclude_household, receives_family_allowance)
values (131, NOW(), NOW(), 131, true, 'Anna', 'Fischer', '1990-06-20', 'FEMALE', 1, false, false);
UPDATE households SET main_person_id = 131 WHERE id = 131;

INSERT INTO households (id, created_at, updated_at, household_id, employee_id, main_person_id,
                        address_street, address_housenumber, address_stairway, address_door, address_postalcode,
                        address_city, telephone_number, email, valid_until, pending_cost_contribution)
values (132, NOW(), NOW(), 132, 100, null, 'Praterstrasse', '10', null, null,
        '1020', 'Wien', null, null, '2999-12-31', 0);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, exclude_household, receives_family_allowance)
values (132, NOW(), NOW(), 132, true, 'Ana', 'Fischer', '1990-06-20', 'FEMALE', 1, false, false);
UPDATE households SET main_person_id = 132 WHERE id = 132;

-- static values
DELETE FROM static_values;

-- income limits
INSERT INTO static_values(id, type, valid_from, valid_to, amount, count_adults, count_children)
VALUES (1, 'INCOME_LIMIT', '1900-01-01', '2999-12-31', 1328.00, 1, 0);
INSERT INTO static_values(id, type, valid_from, valid_to, amount, count_adults, count_children)
VALUES (2, 'INCOME_LIMIT', '1900-01-01', '2999-12-31', 1726.00, 1, 1);
INSERT INTO static_values(id, type, valid_from, valid_to, amount, count_adults, count_children)
VALUES (3, 'INCOME_LIMIT', '1900-01-01', '2999-12-31', 2124.00, 1, 2);
INSERT INTO static_values(id, type, valid_from, valid_to, amount, count_adults, count_children)
VALUES (4, 'INCOME_LIMIT', '1900-01-01', '2999-12-31', 1992.00, 2, 0);
INSERT INTO static_values(id, type, valid_from, valid_to, amount, count_adults, count_children)
VALUES (5, 'INCOME_LIMIT', '1900-01-01', '2999-12-31', 2390.00, 2, 1);
INSERT INTO static_values(id, type, valid_from, valid_to, amount, count_adults, count_children)
VALUES (6, 'INCOME_LIMIT', '1900-01-01', '2999-12-31', 2788.00, 2, 2);
INSERT INTO static_values(id, type, valid_from, valid_to, amount, count_adults, count_children)
VALUES (7, 'INCOME_LIMIT', '1900-01-01', '2999-12-31', 3187.00, 2, 3);
INSERT INTO static_values(id, type, valid_from, valid_to, amount)
VALUES (8, 'ADDITIONAL_ADULT', '1900-01-01', '2999-12-31', 664.00);
INSERT INTO static_values(id, type, valid_from, valid_to, amount)
VALUES (9, 'ADDITIONAL_CHILD', '1900-01-01', '2999-12-31', 398.00);

-- income tolerance
INSERT INTO static_values(id, type, valid_from, valid_to, amount)
VALUES (10, 'TOLERANCE', '1900-01-01', '2999-12-31', 100.00);

-- family allowance
INSERT INTO static_values(id, type, valid_from, valid_to, amount, age)
VALUES (11, 'FAMILY_ALLOWANCE', '1900-01-01', '2999-12-31', 114.00, 0);
INSERT INTO static_values(id, type, valid_from, valid_to, amount, age)
VALUES (12, 'FAMILY_ALLOWANCE', '1900-01-01', '2999-12-31', 121.90, 3);
INSERT INTO static_values(id, type, valid_from, valid_to, amount, age)
VALUES (13, 'FAMILY_ALLOWANCE', '1900-01-01', '2999-12-31', 141.50, 10);
INSERT INTO static_values(id, type, valid_from, valid_to, amount, age)
VALUES (14, 'FAMILY_ALLOWANCE', '1900-01-01', '2999-12-31', 165.10, 19);

-- child tax allowance
INSERT INTO static_values(id, type, valid_from, valid_to, amount)
VALUES (15, 'CHILD_TAX_ALLOWANCE', '1900-01-01', '2999-12-31', 58.40);

-- sibling addition
INSERT INTO static_values(id, type, valid_from, valid_to, amount, count_children)
VALUES (16, 'SIBLING_ADDITION', '1900-01-01', '2999-12-31', 7.10, 2);
INSERT INTO static_values(id, type, valid_from, valid_to, amount, count_children)
VALUES (17, 'SIBLING_ADDITION', '1900-01-01', '2999-12-31', 17.40, 3);
INSERT INTO static_values(id, type, valid_from, valid_to, amount, count_children)
VALUES (18, 'SIBLING_ADDITION', '1900-01-01', '2999-12-31', 26.50, 4);
INSERT INTO static_values(id, type, valid_from, valid_to, amount, count_children)
VALUES (19, 'SIBLING_ADDITION', '1900-01-01', '2999-12-31', 32.00, 5);
INSERT INTO static_values(id, type, valid_from, valid_to, amount, count_children)
VALUES (20, 'SIBLING_ADDITION', '1900-01-01', '2999-12-31', 35.70, 6);
INSERT INTO static_values(id, type, valid_from, valid_to, amount, count_children)
VALUES (21, 'SIBLING_ADDITION', '1900-01-01', '2999-12-31', 52.00, 7);

-- cost contribution
INSERT INTO static_values(id, type, valid_from, valid_to, amount)
VALUES (22, 'COST_CONTRIBUTION', '1900-01-01', '2999-12-31', 4.00);

-- distribution-related
INSERT INTO distributions (id, created_at, updated_at, started_at, ended_at, startedby_userid, endedby_userid, notes)
VALUES (100, NOW(), NOW(), '2023-07-01 14:00:00.000000', '2023-07-01 23:00:00.000000', 300, 300, 'Alles ist gut gelaufen!');
INSERT INTO distributions_statistics (id, created_at, updated_at, distribution_id, count_customers,
                                      count_persons, count_infants, average_persons_per_customer,
                                      count_customers_new, count_persons_new,
                                      count_customers_prolonged, count_persons_prolonged,
                                      count_customers_updated, employee_count)
VALUES (100, NOW(), NOW(), 100, 50, 125, 40, 2.5, 4, 5, 6, 7, 8, 100);

-- register customers to distribution
INSERT INTO distributions_households (id, created_at, updated_at, distribution_id, household_id, ticket_number, processed, cost_contribution_paid)
VALUES (1, NOW(), NOW(), 100, 100, 1, true, false);
INSERT INTO distributions_households (id, created_at, updated_at, distribution_id, household_id, ticket_number, processed, cost_contribution_paid)
VALUES (2, NOW(), NOW(), 100, 101, 2, true, true);
INSERT INTO distributions_households (id, created_at, updated_at, distribution_id, household_id, ticket_number, processed, cost_contribution_paid)
VALUES (3, NOW(), NOW(), 100, 102, 3, true, true);
INSERT INTO distributions_households (id, created_at, updated_at, distribution_id, household_id, ticket_number, processed, cost_contribution_paid)
VALUES (4, NOW(), NOW(), 100, 103, 4, true, true);

-- a closed, recent distribution + one new and one renewed household so "Kunden-Übersicht" isn't
-- empty by default - the window is bracketed tightly around "now" so none of this script's other
-- households (which all share this transaction's NOW() as their own created_at) spill into it
INSERT INTO distributions (id, created_at, updated_at, started_at, ended_at, startedby_userid, endedby_userid, notes)
VALUES (105, NOW(), NOW(), NOW() - interval '3 hours', NOW() - interval '1 hour', 300, 300, 'Für Kunden-Übersicht Demo-Daten');

INSERT INTO households (id, created_at, updated_at, household_id, employee_id, main_person_id,
                        address_street, address_housenumber, address_stairway, address_door, address_postalcode,
                        address_city, telephone_number, email, valid_until, pending_cost_contribution)
values (140, NOW() - interval '90 minutes', NOW() - interval '90 minutes', 140, 100, null, 'Neubaugasse', '20', null, null,
        '1070', 'Wien', '00436601234567', 'neu.kunde@wrk.at', '2999-12-31', 0);
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, employer, income, income_due, exclude_household, receives_family_allowance)
values (140, NOW() - interval '90 minutes', NOW() - interval '90 minutes', 140, true, 'Julia', 'Neukunde', '1992-02-14', 'FEMALE', 1,
        'Stadt Wien', 300.00, '2999-12-31', false, false);
UPDATE households SET main_person_id = 140 WHERE id = 140;

INSERT INTO households (id, created_at, updated_at, household_id, employee_id, main_person_id,
                        address_street, address_housenumber, address_stairway, address_door, address_postalcode,
                        address_city, telephone_number, email, valid_until, pending_cost_contribution, prolonged_at)
values (141, NOW() - interval '400 days', NOW() - interval '400 days', 141, 100, null, 'Landstraßer Hauptstraße', '30', null, null,
        '1030', 'Wien', '00436607654321', 'verlaengert.kunde@wrk.at', '2999-12-31', 0, NOW() - interval '80 minutes');
INSERT INTO persons (id, created_at, updated_at, household_id, is_main_person, firstname, lastname, birth_date, gender,
                     country_id, employer, income, income_due, exclude_household, receives_family_allowance)
values (141, NOW() - interval '400 days', NOW() - interval '400 days', 141, true, 'Stefan', 'Verlaengert', '1978-08-08', 'MALE', 1,
        'Rotes Kreuz Wien', 450.00, '2999-12-31', false, false);
UPDATE households SET main_person_id = 141 WHERE id = 141;

-- shops
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (1, NOW(), NOW(), 100, 'Billa', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Bloch-Bauer-Promenade 1', 1100, 'Wien', 'BOX');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (2, NOW(), NOW(), 200, 'Billa Plus', '01 23 45 67 89',
        'DW 123 od. 456', 'Hr. Mustermann', 'Herzgasse 2', 1110, 'Wien', 'BOX');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (3, NOW(), NOW(), 300, 'Hofer', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien', 'BOX');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (4, NOW(), NOW(), 400, 'Hofer 2', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien', 'BOX');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (5, NOW(), NOW(), 500, 'Hofer 3', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien', 'BOX');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (6, NOW(), NOW(), 600, 'Hofer 4', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien', 'BOX');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (7, NOW(), NOW(), 700, 'Hofer 5', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien', 'BOX');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (8, NOW(), NOW(), 800, 'Hofer 6', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien', 'BOX');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (9, NOW(), NOW(), 900, 'Hofer 7', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien', 'BOX');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (10, NOW(), NOW(), 1000, 'Hofer 8', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien', 'BOX');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (11, NOW(), NOW(), 1100, 'Hofer 9', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien', 'BOX');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (12, NOW(), NOW(), 1200, 'Denns Biomarkt 10', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien', 'BOX');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (13, NOW(), NOW(), 1300, 'Hofer 11', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien', 'BOX');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (14, NOW(), NOW(), 1400, 'Hofer 12', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien', 'BOX');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (15, NOW(), NOW(), 1500, 'Hofer 13', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien', 'BOX');

INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (20, NOW(), NOW(), 2000, 'Lidl', '01 23 45 67 89', null,
        'Hr. Mustermann', 'Kudlichgasse 4', 1130, 'Wien', 'BOX');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (21, NOW(), NOW(), 2100, 'Denns BioMarkt', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Simmeringer Hauptstraße 5', 1140, 'Wien', 'KG');

INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (30, NOW(), NOW(), 3000, 'Denns BioMarkt', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Simmeringer Hauptstraße 5', 1140, 'Wien', 'KG');

INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (31, NOW(), NOW(), 3100, 'Denns BioMarkt', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Simmeringer Hauptstraße 5', 1140, 'Wien', 'KG');

-- routes
INSERT INTO routes (id, created_at, updated_at, number, name, note)
VALUES (1, NOW(), NOW(), 1, 'Route 1', 'Notiz 1');

INSERT INTO routes (id, created_at, updated_at, number, name, note)
VALUES (2, NOW(), NOW(), 2, 'Route 2', null);

INSERT INTO routes (id, created_at, updated_at, number, name, note)
VALUES (3, NOW(), NOW(), 3, 'Route 3', null);

-- shops to routes
INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (1, NOW(), NOW(), 1, 1, '14:00:00');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (2, NOW(), NOW(), 1, 2, '14:15:00');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (3, NOW(), NOW(), 1, 3, '14:30:00');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (4, NOW(), NOW(), 1, 4, '14:45:00');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (5, NOW(), NOW(), 1, 5, '15:00:00');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (6, NOW(), NOW(), 1, 6, '15:15:00');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (7, NOW(), NOW(), 1, 7, '15:30:00');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (8, NOW(), NOW(), 1, 8, '15:45:00');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (9, NOW(), NOW(), 1, 9, '16:00:00');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (10, NOW(), NOW(), 1, 10, '16:15:00');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (11, NOW(), NOW(), 1, 11, '16:30:00');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (12, NOW(), NOW(), 1, 12, '16:45:00');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (13, NOW(), NOW(), 1, 13, '17:00:00');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (14, NOW(), NOW(), 1, 14, '17:15:00');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (15, NOW(), NOW(), 1, 15, '17:30:00');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (200, NOW(), NOW(), 2, 20, '12:00:00');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time, description)
VALUES (210, NOW(), NOW(), 2, null, '12:30:00', 'Extra stop at home');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (220, NOW(), NOW(), 2, 21, '13:00:00');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (300, NOW(), NOW(), 3, 30, '13:00:00');

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (310, NOW(), NOW(), 3, 31, '13:30:00');

-- food categories
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, sort_order)
VALUES (1, NOW(), NOW(), 'Backwaren', 9, 1000);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, sort_order)
VALUES (2, NOW(), NOW(), 'Obst / Gemüse', 17, 1000);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, sort_order)
VALUES (3, NOW(), NOW(), 'Milchprodukte', 18, 1000);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, sort_order)
VALUES (4, NOW(), NOW(), 'Getränke', 10, 1000);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, sort_order)
VALUES (5, NOW(), NOW(), 'Fertiggerichte', 8, 1000);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, sort_order)
VALUES (6, NOW(), NOW(), 'Fleisch / Fisch', 20, 1000);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, sort_order)
VALUES (7, NOW(), NOW(), 'Konserven', 25, 1000);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, sort_order)
VALUES (8, NOW(), NOW(), 'Süßwaren', 9, 1000);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, sort_order)
VALUES (9, NOW(), NOW(), 'Tiefkühlprodukte', 20, 1000);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, sort_order)
VALUES (10, NOW(), NOW(), 'Sonstiges', 15, 1100);

-- return categories (own table - they only label the return boxes, they carry no weight)
INSERT INTO food_return_categories (id, created_at, updated_at, name, sort_order, enabled)
VALUES (11, NOW(), NOW(), 'Graue Kisten', 1, true);
INSERT INTO food_return_categories (id, created_at, updated_at, name, sort_order, enabled)
VALUES (12, NOW(), NOW(), 'Klappkisten schwarz', 2, true);
INSERT INTO food_return_categories (id, created_at, updated_at, name, sort_order, enabled)
VALUES (13, NOW(), NOW(), 'Grüne/Graue Klappkisten', 3, true);
INSERT INTO food_return_categories (id, created_at, updated_at, name, sort_order, enabled)
VALUES (14, NOW(), NOW(), 'Ströck Kisten', 4, true);

-- distributions
INSERT INTO distributions (id, created_at, updated_at, started_at, ended_at, startedby_userid, endedby_userid)
VALUES (1, NOW(), NOW(), '2000-01-01 17:00:00.000000', '2000-01-01 22:00:00.000000', 300, 300);
INSERT INTO distributions_statistics (id, created_at, updated_at, distribution_id, count_customers,
                                      count_persons, count_infants, average_persons_per_customer,
                                      count_customers_new, count_persons_new,
                                      count_customers_prolonged, count_persons_prolonged,
                                      count_customers_updated, employee_count)
VALUES (1, NOW(), NOW(), 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

-- other employees
INSERT INTO employees (id, created_at, updated_at, personnel_number, firstname, lastname)
VALUES (2000, NOW(), NOW(), '02000', 'Driver', '1');
INSERT INTO employees (id, created_at, updated_at, personnel_number, firstname, lastname)
VALUES (2100, NOW(), NOW(), '02100', 'CoDriver', '1');

-- cars
INSERT INTO cars (id, created_at, updated_at, license_plate, name)
VALUES (1, NOW(), NOW(), 'W-NC-123', 'Nice Car 123');
INSERT INTO cars (id, created_at, updated_at, license_plate, name)
VALUES (2, NOW(), NOW(), 'W-NC-456', 'Nice Car 456');
INSERT INTO cars (id, created_at, updated_at, license_plate, name)
VALUES (3, NOW(), NOW(), 'W-NC-789', 'Nice Car 789');
INSERT INTO cars (id, created_at, updated_at, license_plate, name, enabled)
VALUES (4, NOW(), NOW(), 'W-NC-111', 'Old Car 1 disabled', false);
INSERT INTO cars (id, created_at, updated_at, license_plate, name, enabled)
VALUES (5, NOW(), NOW(), 'W-NC-222', 'Old Car 2 disabled', false);

-- food collection for route 1
INSERT INTO food_collections (id, created_at, updated_at, distribution_id, route_id, car_id,
                              driver_employee_id, co_driver_employee_id, km_start, km_end)
VALUES (1, NOW(), NOW(), 100, 1, 1, 2000, 2100, 213000, 213500);

-- food collections items for route 1
-- `weight` is stored, not derived on read (see FoodCollectionItemEntity), so it has to be computed
-- here exactly as the application would: the amount itself for a shop measuring in KG, otherwise
-- amount * the category's weight per unit.
WITH ShopCategories AS (
                        SELECT s.id AS shop_id, fc.id AS food_category_id, s.food_unit, fc.weight_per_unit
                        FROM shops s
                        JOIN routes_stops rs ON rs.shop_id = s.id
                        JOIN routes r ON rs.route_id = r.id
                        CROSS JOIN food_categories fc
                        WHERE r.id = 1
                        ),
     Items AS (SELECT sc.*, sc.shop_id AS amount -- using same as amount
               FROM ShopCategories sc)
INSERT
INTO food_collections_items (food_collection_id,
                             shop_id,
                             food_category_id,
                             amount,
                             weight)
SELECT 1,         -- fixed collection 1
       i.shop_id,
       i.food_category_id,
       i.amount,
       CASE WHEN i.food_unit = 'KG' THEN i.amount ELSE i.amount * COALESCE(i.weight_per_unit, 0) END
FROM Items i;

-- food collection for route 2
INSERT INTO food_collections (id, created_at, updated_at, distribution_id, route_id, car_id,
                              driver_employee_id, co_driver_employee_id, km_start, km_end)
VALUES (2, NOW(), NOW(), 100, 2, 2, 2000, 2100, 213000, 213500);

-- food collections items for route 2
WITH ShopCategories AS (
    SELECT s.id AS shop_id, fc.id AS food_category_id
    FROM shops s
             JOIN routes_stops rs ON rs.shop_id = s.id
             JOIN routes r ON rs.route_id = r.id
             CROSS JOIN food_categories fc
    WHERE r.id = 2
)
INSERT
INTO food_collections_items (food_collection_id,
                             shop_id,
                             food_category_id,
                             amount,
                             weight)
SELECT 2,         -- fixed collection 2
       sc.shop_id,
       sc.food_category_id,
       0, -- amount
       0  -- a zero amount weighs nothing whatever the unit is
FROM ShopCategories sc;

-- food collection for route 3 (empty)
INSERT INTO food_collections (id, created_at, updated_at, distribution_id, route_id, car_id,
                              driver_employee_id, co_driver_employee_id, km_start, km_end)
VALUES (3, NOW(), NOW(), 100, 3, 3, 2000, 2100, 1000, 1200);

-- food collections items for route 3 (all empty)
WITH ShopCategories AS (
    SELECT s.id AS shop_id, fc.id AS food_category_id, s.food_unit, fc.weight_per_unit
    FROM shops s
             JOIN routes_stops rs ON rs.shop_id = s.id
             JOIN routes r ON rs.route_id = r.id
             CROSS JOIN food_categories fc
    WHERE r.id = 3
)
INSERT
INTO food_collections_items (food_collection_id,
                             shop_id,
                             food_category_id,
                             amount,
                             weight)
SELECT 3,         -- fixed collection 3
       sc.shop_id,
       sc.food_category_id,
       1, -- amount
       CASE WHEN sc.food_unit = 'KG' THEN 1 ELSE COALESCE(sc.weight_per_unit, 0) END
FROM ShopCategories sc;

-- shelters
INSERT INTO shelters (id, created_at, updated_at, name, address_street, address_houseNumber, address_stairway,
                      address_door, address_postalCode, address_city, note, persons_count, enabled)
values (1, NOW(), NOW(), 'Shelter 1', 'Erdberg', 1, null, null, '1030', 'Wien', 'Gleich um die Ecke', 100, true);
INSERT INTO shelters (id, created_at, updated_at, name, address_street, address_houseNumber, address_stairway,
                      address_door, address_postalCode, address_city, note, persons_count, enabled)
values (2, NOW(), NOW(), 'Shelter 2 with a very long name', 'Erdberg', 2, '1', '10', '1030', 'Wien', null, 50, true);
INSERT INTO shelters (id, created_at, updated_at, name, address_street, address_houseNumber, address_stairway,
                      address_door, address_postalCode, address_city, note, persons_count, enabled)
values (3, NOW(), NOW(), 'Shelter 3', 'Erdberg', 3, null, null, '1030', 'Wien', null, 0, true);
INSERT INTO shelters (id, created_at, updated_at, name, address_street, address_houseNumber, address_stairway,
                      address_door, address_postalCode, address_city, note, persons_count, enabled)
values (4, NOW(), NOW(), 'Shelter 4 disabled', 'Erdberg', 4, null, null, '1040', 'Wien', null, 0, false);

INSERT INTO shelters_contacts (id, created_at, updated_at, shelter_id, firstname, lastname, phone)
values (1, NOW(), NOW(), 1, null, null, '01 23 45 67 89');
INSERT INTO shelters_contacts (id, created_at, updated_at, shelter_id, firstname, lastname, phone)
values (2, NOW(), NOW(), 1, 'Eva', 'Musterfrau', '01 23 45 67 89');

INSERT INTO shelters_contacts (id, created_at, updated_at, shelter_id, firstname, lastname, phone)
values (3, NOW(), NOW(), 2, 'Eva 2', 'Musterfrau 2', '01 23 45 67 89');

-- shelters in statistics of distributions
INSERT INTO distributions_statistics_shelters (id, created_at, updated_at, distribution_statistic_id, name, address_street, address_houseNumber,
                                               address_stairway,
                                               address_door, address_postalCode, address_city, persons_count)
values (1, NOW(), NOW(), 100, 'Shelter 1', 'Erdberg', 1, null, null, '1030', 'Wien', 100);
INSERT INTO distributions_statistics_shelters (id, created_at, updated_at, distribution_statistic_id, name, address_street, address_houseNumber,
                                               address_stairway,
                                               address_door, address_postalCode, address_city, persons_count)
values (2, NOW(), NOW(), 100, 'Shelter 2 with a very long name', 'Erdberg', 1, null, null, '1030', 'Wien', 50);

-- mail recipients
INSERT INTO mail_recipients (id, mail_type, recipient_type, address)
VALUES (1, 'DAILY_REPORT', 'TO', 'tagesreport-empfaenger1@beispiel.at');
INSERT INTO mail_recipients (id, mail_type, recipient_type, address)
VALUES (2, 'DAILY_REPORT', 'TO', 'tagesreport-empfaenger2@beispiel.at');
INSERT INTO mail_recipients (id, mail_type, recipient_type, address)
VALUES (4, 'DAILY_REPORT', 'BCC', 'tagesreport-bcc@beispiel.at');
INSERT INTO mail_recipients (id, mail_type, recipient_type, address)
VALUES (5, 'STATISTICS', 'TO', 'statistik-empfaenger@beispiel.at');
INSERT INTO mail_recipients (id, mail_type, recipient_type, address)
VALUES (6, 'RETURN_BOXES', 'TO', 'retourkisten-empfaenger@beispiel.at');

-- login attempts
-- last_failure_at is set a couple of years into the future (rather than NOW()) so these rows never
-- look "stale" to LoginAttemptService.cleanupStaleEntries(), which hourly deletes anything older
-- than the lockout duration (5 min by default) - without this, the seeded rows would vanish shortly
-- after the app starts. 2 years is comfortably longer than any local dev/testing session while
-- still rendering as a plausible-looking date rather than an obviously-fake far-future one.
-- locked_until is pushed out the same way, so the "Gesperrt" status (isLocked() in the frontend
-- just compares against "now") stays visible for as long as this testdata is loaded.
INSERT INTO login_attempts (id, created_at, updated_at, username, failure_count, last_failure_at, locked_until)
VALUES (1, NOW(), NOW(), 'gesperrt1', 5, NOW() + interval '2 years', NOW() + interval '2 years');
INSERT INTO login_attempts (id, created_at, updated_at, username, failure_count, last_failure_at, locked_until)
VALUES (2, NOW(), NOW(), 'fehlversuch1', 2, NOW() + interval '2 years', NULL);


-- 100 recorded changes, so the Änderungsprotokoll screen has something to show and its filters
-- something to filter. Written directly rather than by exercising the application, which is the
-- only way to get a spread of dates out of a fixture that loads in one moment - and the reason
-- these rows carry no matching change in the data itself: they describe edits that never happened.
--
-- Shaped so each filter has a visible effect: every entity type and operation occurs, the actors
-- are three different users, and the business keys are households that exist in this fixture. The
-- timestamps run from 2 hours to ~29 days old - deliberately inside tafeladmin.audit.retentionDays,
-- so the nightly cleanup never quietly removes half the fixture from a long-running environment.
-- That also means the screen opens with all of them: narrowing the date range is what shows it
-- working, which is what one actually does with it.
--
-- The newest is deliberately 2 hours old: an e2e test that creates a customer and then reads the
-- log expects its own change first, which a fixture row stamped "now" could tie with.
WITH shapes (idx, entity_type, entity_id, business_key, operation, changed_fields) AS (
    VALUES (0, 'Household', 100, '100', 'UPDATE',
            '{"addressCity": ["Wien", "Graz"], "addressPostalCode": ["1030", "8010"]}'),
           (1, 'Household', 101, '101', 'UPDATE',
            '{"telephoneNumber": ["00436645678953", "00436641112223"]}'),
           (2, 'Household', 102, '102', 'INSERT',
            '{"addressStreet": [null, "Erdberg"], "addressCity": [null, "Wien"], "validUntil": [null, "2999-12-31"]}'),
           (3, 'Household', 103, '103', 'DELETE',
            '{"addressStreet": ["Erdberg", null], "addressCity": ["Wien", null], "email": ["geloescht@wrk.at", null]}'),
           (4, 'Person', 104, '104', 'UPDATE',
            '{"income": ["456.00", "512.00"], "incomeDue": ["2026-01-31", "2026-07-31"]}'),
           (5, 'Person', 105, '105', 'INSERT',
            '{"firstname": [null, "Neues"], "lastname": [null, "Haushaltsmitglied"], "isMainPerson": [null, false]}'),
           (6, 'HouseholdNote', 110, '110', 'INSERT',
            '{"note": [null, "Kunde hat Einkommensnachweis nachgereicht"]}'),
           (7, 'Document', 111, '111', 'INSERT',
            '{"fileName": [null, "einkommensnachweis.pdf"], "documentType": [null, "INCOME"]}'),
           (8, 'User', 200, 'testuser', 'UPDATE',
            '{"enabled": [true, false], "passwordChangeRequired": [false, true]}'),
           (9, 'UserAuthority', 200, 'testuser', 'INSERT',
            '{"name": [null, "CUSTOMERS_OVERVIEW"]}'),
           (10, 'StaticValue', 1, 'INCOME_LIMIT', 'UPDATE',
            '{"amount": ["1200.00", "1250.00"]}'),
           (11, 'MailRecipient', 1, 'DAILY_REPORT', 'UPDATE',
            '{"address": ["alt@wrk.at", "neu@wrk.at"]}')
)
INSERT INTO audit_log (id, occurred_at, actor_user_id, actor_username, entity_type, entity_id,
                       business_key, operation, changed_fields)
SELECT n,
       NOW() - interval '2 hours' - (n * interval '7 hours'),
       CASE n % 3 WHEN 0 THEN 100 WHEN 1 THEN 300 ELSE 200 END,
       CASE n % 3 WHEN 0 THEN 'e2etest' WHEN 1 THEN 'admin' ELSE 'testuser' END,
       shapes.entity_type,
       shapes.entity_id,
       shapes.business_key,
       shapes.operation,
       shapes.changed_fields::jsonb
FROM generate_series(1, 100) AS n
         JOIN shapes ON shapes.idx = n % 12;


-- A single customer with a full history, so the "Verlauf" tab on the customer detail screen shows
-- something without having to make changes by hand first. Kunde 132 is the one to open when testing
-- it: every entity type that belongs to a household occurs, spread over the last three weeks and
-- across three different users.
INSERT INTO audit_log (id, occurred_at, actor_user_id, actor_username, entity_type, entity_id,
                       business_key, operation, changed_fields)
VALUES (201, NOW() - interval '3 hours', 100, 'e2etest', 'Household', 132, '132', 'UPDATE',
        '{"telephoneNumber": ["00436641111111", "00436642222222"], "email": ["alt@wrk.at", "neu@wrk.at"]}'::jsonb),
       (202, NOW() - interval '1 day', 300, 'admin', 'Person', 132, '132', 'UPDATE',
        '{"income": ["1100.00", "1250.00"], "incomeDue": ["2026-06-30", "2026-12-31"]}'::jsonb),
       (203, NOW() - interval '2 days', 100, 'e2etest', 'HouseholdNote', 1321, '132', 'INSERT',
        '{"note": [null, "Einkommensnachweis nachgereicht und geprueft"]}'::jsonb),
       (204, NOW() - interval '4 days', 200, 'testuser', 'Document', 1322, '132', 'INSERT',
        '{"fileName": [null, "einkommensnachweis.pdf"], "documentType": [null, "INCOME"]}'::jsonb),
       (205, NOW() - interval '6 days', 300, 'admin', 'Household', 132, '132', 'UPDATE',
        '{"addressStreet": ["Erdberg", "Landstrasser Hauptstrasse"], "addressHousenumber": ["5", "12"]}'::jsonb),
       (206, NOW() - interval '8 days', 100, 'e2etest', 'Person', 1323, '132', 'INSERT',
        '{"firstname": [null, "Lena"], "lastname": [null, "Musterkind"], "isMainPerson": [null, false]}'::jsonb),
       (207, NOW() - interval '11 days', 300, 'admin', 'Household', 132, '132', 'UPDATE',
        '{"locked": [false, true], "lockReason": [null, "Unterlagen unvollstaendig"]}'::jsonb),
       (208, NOW() - interval '13 days', 300, 'admin', 'Household', 132, '132', 'UPDATE',
        '{"locked": [true, false], "lockReason": ["Unterlagen unvollstaendig", null]}'::jsonb),
       (209, NOW() - interval '16 days', 200, 'testuser', 'Person', 1324, '132', 'DELETE',
        '{"firstname": ["Ausgezogenes", null], "lastname": ["Haushaltsmitglied", null]}'::jsonb),
       (210, NOW() - interval '19 days', 100, 'e2etest', 'HouseholdNote', 1325, '132', 'INSERT',
        '{"note": [null, "Telefonisch nicht erreichbar"]}'::jsonb),
       (211, NOW() - interval '22 days', 100, 'e2etest', 'Household', 132, '132', 'UPDATE',
        '{"validUntil": ["2026-06-30", "2026-12-31"], "prolongedAt": [null, "2026-07-18T10:12:00"]}'::jsonb),
       (212, NOW() - interval '26 days', 100, 'e2etest', 'Household', 132, '132', 'INSERT',
        '{"addressStreet": [null, "Erdberg"], "addressCity": [null, "Wien"], "validUntil": [null, "2026-06-30"]}'::jsonb);
