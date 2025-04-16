-- adapt sequences
SELECT setval('customer_id_sequence', 10000, false);
SELECT setval('hibernate_sequence', 10000, false);

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

-- customers
INSERT INTO customers (id, created_at, updated_at, customer_id, employee_id, firstname, lastname, birth_date, gender,
                       country_id,
                       address_street, address_houseNumber, address_stairway, address_door, address_postalCode,
                       address_city, telephone_number, email, employer, income, income_due, valid_until)
values (100, NOW(), NOW(), 100, 100, 'Max Single', 'Mustermann', '1980-01-01', 'MALE', 1, 'Erdberg', 1, null, null,
        '1030', 'Wien', '00436645678953', 'max.single.mustermann@wrk.at', 'Stadt Wien', 123.00, '2999-12-31', '2999-12-31');
INSERT INTO customers (id, created_at, updated_at, customer_id, employee_id, firstname, lastname, birth_date, gender,
                       country_id,
                       address_street, address_houseNumber, address_stairway, address_door, address_postalCode,
                       address_city, telephone_number, email, employer, income, income_due, valid_until)
values (101, NOW(), NOW(), 101, 100, 'Eva', 'Musterfrau', '1990-01-01', 'FEMALE', 2, 'Erdberg', 2, '1', '20', '1010',
        'Wien', '00436645678953', 'eva.musterfrau@wrk.at', 'Rotes Kreuz Wien', 456.00, '2999-12-31', '2999-12-31');
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender,
                                  income,
                                  income_due, country_id, receives_familybonus)
values (1011, NOW(), NOW(), 101, 'Child 1', 'Musterfrau', '2000-01-01', 'FEMALE', 500, '2999-12-31', 1, false);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender,
                                  employer,
                                  income,
                                  income_due, country_id, receives_familybonus)
values (1012, NOW(), NOW(), 101, 'Child 2', 'Musterfrau', CURRENT_DATE - interval '2 year', 'FEMALE', 'Stadt Wien',
        null, null, 1,
        true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender,
                                  employer,
                                  income,
                                  income_due, country_id, receives_familybonus, exclude_household)
values (1013, NOW(), NOW(), 101, 'Child 3', 'Musterfrau', CURRENT_DATE - interval '2 year', 'MALE', 'WRK', null, null,
        1, true,
        true);
INSERT INTO customers_notes (id, created_at, updated_at, customer_id, employee_id, note)
VALUES (1003, NOW(), NOW(), 101, 100,
        'Testnote 3.<br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.<br/><br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO customers_notes (id, created_at, updated_at, customer_id, employee_id, note)
VALUES (1002, NOW(), NOW(), 101, 100, 'Testnote 2');
INSERT INTO customers_notes (id, created_at, updated_at, customer_id, employee_id, note)
VALUES (1001, NOW(), NOW(), 101, null, 'Testnote 1');

INSERT INTO customers (id, created_at, updated_at, customer_id, employee_id, firstname, lastname, birth_date, gender,
                       country_id,
                       address_street, address_houseNumber, address_stairway, address_door, address_postalCode,
                       address_city, telephone_number, email, employer, income, income_due, valid_until)
values (102, NOW(), NOW(), 102, 100, 'John', 'Doe', '1980-01-01', 'MALE', 1, 'Erdberg', 1, null, null, '1030', 'Wien',
        '00436645678953', 'john.doe@wrk.at', 'Stadt Wien', 123.00, '2999-12-31', '2999-12-31');
INSERT INTO customers (id, created_at, updated_at, customer_id, employee_id, firstname, lastname, birth_date, gender,
                       country_id,
                       address_street, address_houseNumber, address_stairway, address_door, address_postalCode,
                       address_city, telephone_number, email, employer, income, income_due, valid_until)
values (103, NOW(), NOW(), 103, 100, 'John Doe', 'EXPIRES SOON', '1980-01-01', 'MALE', 1, 'Erdberg', 1, null, null,
        '1030', 'Wien', null, null, 'Stadt Wien', 123.00, NOW() + interval '1 month', NOW() + interval '1 month');
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender,
                                  income,
                                  income_due, country_id, receives_familybonus)
values (1031, NOW(), NOW(), 103, 'Child 1', 'Musterfrau', CURRENT_DATE - interval '1 year', null, 500, '2999-12-31', 1,
        false);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender,
                                  employer,
                                  income,
                                  income_due, country_id, receives_familybonus)
values (1032, NOW(), NOW(), 103, 'Child 2', 'Musterfrau', CURRENT_DATE - interval '2 year', null, 'Stadt Wien', null,
        null, 1,
        true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender,
                                  employer,
                                  income,
                                  income_due, country_id, receives_familybonus, exclude_household)
values (1033, NOW(), NOW(), 103, 'Child 3', 'Musterfrau', CURRENT_DATE - interval '3 year', 'FEMALE', 'WRK', null, null,
        1, true,
        true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender,
                                  employer,
                                  income,
                                  income_due, country_id, receives_familybonus, exclude_household)
values (1034, NOW(), NOW(), 103, 'Child 4', 'Musterfrau', CURRENT_DATE - interval '4 year', 'FEMALE', 'WRK', null, null,
        1, true,
        true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender,
                                  employer,
                                  income,
                                  income_due, country_id, receives_familybonus, exclude_household)
values (1035, NOW(), NOW(), 103, 'Child 5', 'Musterfrau', CURRENT_DATE - interval '5 year', 'MALE', 'WRK', null, null,
        1, true,
        true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender,
                                  employer,
                                  income,
                                  income_due, country_id, receives_familybonus, exclude_household)
values (1036, NOW(), NOW(), 103, 'Child 6', 'Musterfrau', CURRENT_DATE - interval '6 year', 'MALE', 'WRK', null, null,
        1, true,
        true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender,
                                  employer,
                                  income,
                                  income_due, country_id, receives_familybonus, exclude_household)
values (1037, NOW(), NOW(), 103, 'Child 7', 'Musterfrau', CURRENT_DATE - interval '7 year', 'MALE', 'WRK', null, null,
        1, true,
        true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender,
                                  employer,
                                  income,
                                  income_due, country_id, receives_familybonus, exclude_household)
values (1038, NOW(), NOW(), 103, 'Child 8', 'Musterfrau', CURRENT_DATE - interval '8 year', 'MALE', 'WRK', null, null,
        1, true,
        true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender,
                                  employer,
                                  income,
                                  income_due, country_id, receives_familybonus, exclude_household)
values (1039, NOW(), NOW(), 103, 'Child 9', 'Musterfrau', CURRENT_DATE - interval '9 year', 'MALE', 'WRK', null, null,
        1, true,
        true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender,
                                  employer,
                                  income,
                                  income_due, country_id, receives_familybonus, exclude_household)
values (1040, NOW(), NOW(), 103, 'Child 10', 'Musterfrau', CURRENT_DATE - interval '10 year', 'MALE', 'WRK', null, null,
        1, true,
        true);
INSERT INTO customers_notes (id, created_at, updated_at, customer_id, employee_id, note)
VALUES (1041, NOW(), NOW(), 103, 100,
        'Testnote 1.<br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.<br/><br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO customers_notes (id, created_at, updated_at, customer_id, employee_id, note)
VALUES (1042, NOW(), NOW(), 103, 100,
        'Testnote 2.<br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.<br/><br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO customers_notes (id, created_at, updated_at, customer_id, employee_id, note)
VALUES (1043, NOW(), NOW(), 103, 100,
        'Testnote 3.<br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.<br/><br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO customers_notes (id, created_at, updated_at, customer_id, employee_id, note)
VALUES (1044, NOW(), NOW(), 103, 100,
        'Testnote 4.<br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.<br/><br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO customers_notes (id, created_at, updated_at, customer_id, employee_id, note)
VALUES (1045, NOW(), NOW(), 103, 100,
        'Testnote 5.<br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.<br/><br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO customers_notes (id, created_at, updated_at, customer_id, employee_id, note)
VALUES (1046, NOW(), NOW(), 103, 100,
        'Testnote 6.<br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.<br/><br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO customers_notes (id, created_at, updated_at, customer_id, employee_id, note)
VALUES (1047, NOW(), NOW(), 103, 100,
        'Testnote 7.<br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.<br/><br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO customers_notes (id, created_at, updated_at, customer_id, employee_id, note)
VALUES (1048, NOW(), NOW(), 103, 100,
        'Testnote 8.<br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.<br/><br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO customers_notes (id, created_at, updated_at, customer_id, employee_id, note)
VALUES (1049, NOW(), NOW(), 103, 100,
        'Testnote 9.<br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.<br/><br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO customers_notes (id, created_at, updated_at, customer_id, employee_id, note)
VALUES (1050, NOW(), NOW(), 103, 100,
        'Testnote 10.<br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.<br/><br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');

INSERT INTO customers (id, created_at, updated_at, customer_id, employee_id, firstname, lastname, birth_date, gender,
                       country_id,
                       address_street, address_houseNumber, address_stairway, address_door, address_postalCode,
                       address_city, telephone_number, email, employer, income, income_due, valid_until)
values (104, NOW(), NOW(), 104, 100, 'Jane Doe', 'EXPIRED', '1980-01-01', 'FEMALE', 1, 'Erdberg', 1, null, null, '1030',
        'Wien', null, null, 'Stadt Wien', 123.00, '2000-12-31', '2000-12-31');
INSERT INTO customers (id, created_at, updated_at, customer_id, employee_id, firstname, lastname, birth_date, gender,
                       country_id,
                       address_street, address_houseNumber, address_stairway, address_door, address_postalCode,
                       address_city, telephone_number, email, employer, income, income_due, valid_until, locked,
                       locked_at, locked_by, lock_reason)
values (105, NOW(), NOW(), 105, 100, 'Jane Doe', 'LOCKED', '1980-01-01', 'FEMALE', 1, 'Erdberg', 1, null, null, '1030',
        'Wien', null, null, 'Stadt Wien', 123.00, '2999-12-31', '2999-12-31', true, NOW(), 100, 'Lock-Reason: Lorem ipsum dolor sit amet');
INSERT INTO customers (id, created_at, updated_at, customer_id, employee_id, firstname, lastname, birth_date, gender,
                       country_id,
                       address_street, address_houseNumber, address_stairway, address_door, address_postalCode,
                       address_city, telephone_number, email, employer, income, income_due, valid_until, locked,
                       locked_at, locked_by, lock_reason)
values (106, NOW(), NOW(), 106, null, null, null, null, null, 1, null, null, null, null, null, null,
        null, null, null, null, null, NOW(), false, null, null, null);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender,
                                  employer,
                                  income, income_due, country_id, receives_familybonus, exclude_household)
values (1060, NOW(), NOW(), 106, 'Firstname 1', 'Lastname 1', null, null, null, null, null, 1, true, true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender,
                                  employer,
                                  income, income_due, country_id, receives_familybonus, exclude_household)
values (1061, NOW(), NOW(), 106, 'Firstname 2', 'Lastname 2', null, null, null, null, null, 1, false, false);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender,
                                  employer,
                                  income, income_due, country_id, receives_familybonus, exclude_household)
values (1062, NOW(), NOW(), 106, 'Firstname 3', 'Lastname 3', null, null, null, null, null, 1, true, false);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender,
                                  employer,
                                  income, income_due, country_id, receives_familybonus, exclude_household)
values (1063, NOW(), NOW(), 106, 'Firstname 4', 'Lastname 4', null, null, null, null, null, 1, false, true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender,
                                  employer,
                                  income, income_due, country_id, receives_familybonus, exclude_household)
values (1064, NOW(), NOW(), 106, 'Firstname 5', 'Lastname 5', null, null, null, null, null, 1, false, false);

-- static values
DELETE FROM static_income_limits;

-- income limits
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount, count_adults, count_children)
VALUES (1, 'INCOME_LIMIT', '1900-01-01', '2999-12-31', 1328.00, 1, 0);
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount, count_adults, count_children)
VALUES (2, 'INCOME_LIMIT', '1900-01-01', '2999-12-31', 1726.00, 1, 1);
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount, count_adults, count_children)
VALUES (3, 'INCOME_LIMIT', '1900-01-01', '2999-12-31', 2124.00, 1, 2);
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount, count_adults, count_children)
VALUES (4, 'INCOME_LIMIT', '1900-01-01', '2999-12-31', 1992.00, 2, 0);
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount, count_adults, count_children)
VALUES (5, 'INCOME_LIMIT', '1900-01-01', '2999-12-31', 2390.00, 2, 1);
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount, count_adults, count_children)
VALUES (6, 'INCOME_LIMIT', '1900-01-01', '2999-12-31', 2788.00, 2, 2);
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount, count_adults, count_children)
VALUES (7, 'INCOME_LIMIT', '1900-01-01', '2999-12-31', 3187.00, 2, 3);
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount)
VALUES (8, 'ADDITIONAL_ADULT', '1900-01-01', '2999-12-31', 664.00);
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount)
VALUES (9, 'ADDITIONAL_CHILD', '1900-01-01', '2999-12-31', 398.00);

-- income tolerance
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount)
VALUES (10, 'INCOME_TOLERANCE', '1900-01-01', '2999-12-31', 100.00);

-- family bonus
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount, age)
VALUES (11, 'FAMILY_BONUS', '1900-01-01', '2999-12-31', 114.00, 0);
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount, age)
VALUES (12, 'FAMILY_BONUS', '1900-01-01', '2999-12-31', 121.90, 3);
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount, age)
VALUES (13, 'FAMILY_BONUS', '1900-01-01', '2999-12-31', 141.50, 10);
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount, age)
VALUES (14, 'FAMILY_BONUS', '1900-01-01', '2999-12-31', 165.10, 19);

-- child tax allowance
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount)
VALUES (15, 'CHILD_TAX_ALLOWANCE', '1900-01-01', '2999-12-31', 58.40);

-- sibling addition
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount, count_children)
VALUES (16, 'SIBLING_ADDITION', '1900-01-01', '2999-12-31', 7.10, 2);
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount, count_children)
VALUES (17, 'SIBLING_ADDITION', '1900-01-01', '2999-12-31', 17.40, 3);
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount, count_children)
VALUES (18, 'SIBLING_ADDITION', '1900-01-01', '2999-12-31', 26.50, 4);
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount, count_children)
VALUES (19, 'SIBLING_ADDITION', '1900-01-01', '2999-12-31', 32.00, 5);
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount, count_children)
VALUES (20, 'SIBLING_ADDITION', '1900-01-01', '2999-12-31', 35.70, 6);
INSERT INTO static_income_limits(id, type, valid_from, valid_to, amount, count_children)
VALUES (21, 'SIBLING_ADDITION', '1900-01-01', '2999-12-31', 52.00, 7);

-- distribution-related
INSERT INTO distributions (id, created_at, updated_at, started_at, ended_at, startedby_userid, endedby_userid, notes)
VALUES (100, NOW(), NOW(), '2023-07-01 14:00:00.000000', '2023-07-01 23:00:00.000000', 300, 300, 'Everything went well!');
INSERT INTO distributions_statistics (id, created_at, updated_at, distribution_id, count_customers,
                                      count_persons, count_infants, average_persons_per_customer,
                                      count_customers_new, count_persons_new,
                                      count_customers_prolonged, count_persons_prolonged,
                                      count_customers_updated, employee_count, persons_in_shelter_count)
VALUES (100, NOW(), NOW(), 100, 50, 125, 40, 2.5, 4, 5, 6, 7, 8, 100, 200);

-- register customers to distribution
INSERT INTO distributions_customers (id, created_at, updated_at, distribution_id, customer_id, ticket_number, processed)
VALUES (1, NOW(), NOW(), 100, 101, 1, true);
INSERT INTO distributions_customers (id, created_at, updated_at, distribution_id, customer_id, ticket_number, processed)
VALUES (2, NOW(), NOW(), 100, 102, 2, true);
INSERT INTO distributions_customers (id, created_at, updated_at, distribution_id, customer_id, ticket_number, processed)
VALUES (3, NOW(), NOW(), 100, 103, 3, true);

-- shops
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city, food_unit)
VALUES (1, NOW(), NOW(), 100, 'Billa', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Bloch-Bauer-promenade 1', 1100, 'Wien', 'BOX');
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
VALUES (1, NOW(), NOW(), 1, 'Route 1', 'Note 1');

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
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, return_item)
VALUES (1, NOW(), NOW(), 'Backwaren', 9, false);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, return_item)
VALUES (2, NOW(), NOW(), 'Obst / Gemüse', 17, false);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, return_item)
VALUES (3, NOW(), NOW(), 'Milchprodukte', 18, false);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, return_item)
VALUES (4, NOW(), NOW(), 'Getränke', 10, false);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, return_item)
VALUES (5, NOW(), NOW(), 'Fertiggerichte', 8, false);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, return_item)
VALUES (6, NOW(), NOW(), 'Fleisch / Fisch', 20, false);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, return_item)
VALUES (7, NOW(), NOW(), 'Konserven', 25, false);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, return_item)
VALUES (8, NOW(), NOW(), 'Süßwaren', 9, false);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, return_item)
VALUES (9, NOW(), NOW(), 'Tiefkühlprodukte', 20, false);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, return_item)
VALUES (10, NOW(), NOW(), 'Sonstiges', 15, false);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, return_item)
VALUES (11, NOW(), NOW(), 'Graue Kisten', null, true);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, return_item)
VALUES (12, NOW(), NOW(), 'Klappkisten schwarz', null, true);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, return_item)
VALUES (13, NOW(), NOW(), 'Grüne Kisten', null, true);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, return_item)
VALUES (14, NOW(), NOW(), 'Ströck Kisten', null, true);
INSERT INTO food_categories (id, created_at, updated_at, name, weight_per_unit, return_item)
VALUES (15, NOW(), NOW(), 'sonstige Kisten', null, true);

-- distributions
INSERT INTO distributions (id, created_at, updated_at, started_at, ended_at, startedby_userid, endedby_userid)
VALUES (1, NOW(), NOW(), '2000-01-01 17:00:00.000000', '2000-01-01 22:00:00.000000', 300, 300);

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

-- food collection for route 1
INSERT INTO food_collections (id, created_at, updated_at, distribution_id, route_id, car_id,
                              driver_employee_id, co_driver_employee_id, km_start, km_end)
VALUES (1, NOW(), NOW(), 100, 1, 1, 2000, 2100, 213000, 213500);

-- food collections items for route 1
WITH ShopCategories AS (
                        SELECT s.id AS shop_id, fc.id AS food_category_id
                        FROM shops s
                        JOIN routes_stops rs ON rs.shop_id = s.id
                        JOIN routes r ON rs.route_id = r.id
                        CROSS JOIN food_categories fc
                        WHERE r.id = 1
                        )
INSERT
INTO food_collections_items (food_collection_id,
                             shop_id,
                             food_category_id,
                             amount)
SELECT 1,         -- fixed collection 1
       sc.shop_id,
       sc.food_category_id,
       sc.shop_id -- using same as amount
FROM ShopCategories sc;

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
                             amount)
SELECT 2,         -- fixed collection 2
       sc.shop_id,
       sc.food_category_id,
       0 -- amount
FROM ShopCategories sc;

-- food collection for route 3 (empty)
INSERT INTO food_collections (id, created_at, updated_at, distribution_id, route_id, car_id,
                              driver_employee_id, co_driver_employee_id, km_start, km_end)
VALUES (3, NOW(), NOW(), 100, 3, 3, 2000, 2100, 1000, 1200);

-- food collections items for route 3 (all empty)
WITH ShopCategories AS (
    SELECT s.id AS shop_id, fc.id AS food_category_id
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
                             amount)
SELECT 3,         -- fixed collection 3
       sc.shop_id,
       sc.food_category_id,
       1 -- amount
FROM ShopCategories sc;

-- shelters
INSERT INTO shelters (id, created_at, updated_at, name, address_street, address_houseNumber, address_stairway,
                      address_door, address_postalCode, address_city, note, persons_count)
values (1, NOW(), NOW(), 'Shelter 1', 'Erdberg', 1, null, null, '1030', 'Wien', 'Right around the corner', 100);
INSERT INTO shelters (id, created_at, updated_at, name, address_street, address_houseNumber, address_stairway,
                      address_door, address_postalCode, address_city, note, persons_count)
values (2, NOW(), NOW(), 'Shelter 2 with a very long name', 'Erdberg', 2, '1', '10', '1030', 'Wien', null, 50);
INSERT INTO shelters (id, created_at, updated_at, name, address_street, address_houseNumber, address_stairway,
                      address_door, address_postalCode, address_city, note, persons_count)
values (3, NOW(), NOW(), 'Shelter 3', 'Erdberg', 3, null, null, '1030', 'Wien', null, 0);

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
VALUES (1, 'DAILY_REPORT', 'TO', 'dailyreport-to1@domain.com');
INSERT INTO mail_recipients (id, mail_type, recipient_type, address)
VALUES (2, 'DAILY_REPORT', 'TO', 'dailyreport-to2@domain.com');
INSERT INTO mail_recipients (id, mail_type, recipient_type, address)
VALUES (4, 'DAILY_REPORT', 'BCC', 'dailyreport-bcc@domain.com');
INSERT INTO mail_recipients (id, mail_type, recipient_type, address)
VALUES (5, 'STATISTICS', 'TO', 'statistics-to@domain.com');
INSERT INTO mail_recipients (id, mail_type, recipient_type, address)
VALUES (6, 'RETURN_BOXES', 'TO', 'returnboxes-to@domain.com');
