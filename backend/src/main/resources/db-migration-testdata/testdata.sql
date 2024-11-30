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
INSERT INTO customers (id, created_at, updated_at, customer_id, employee_id, firstname, lastname, birth_date, gender, country_id,
                       address_street, address_houseNumber, address_stairway, address_door, address_postalCode,
                       address_city, telephone_number, email, employer, income, income_due, valid_until)
values (100, NOW(), NOW(), 100, 100, 'Max Single', 'Mustermann', '1980-01-01', 'MALE', 1, 'Erdberg', 1, null, null, '1030',
        'Wien',
        null, null, 'Stadt Wien', 123.00, '2999-12-31', '2999-12-31');
INSERT INTO customers (id, created_at, updated_at, customer_id, employee_id, firstname, lastname, birth_date, gender, country_id,
                       address_street, address_houseNumber, address_stairway, address_door, address_postalCode,
                       address_city, telephone_number, email, employer, income, income_due, valid_until)
values (101, NOW(), NOW(), 101, 100, 'Eva', 'Musterfrau', '1990-01-01', 'FEMALE', 2, 'Erdberg', 2, '1', '20', '1010', 'Wien',
        '00436645678953', 'eva.musterfrau@wrk.at', 'Rotes Kreuz Wien', 456.00, '2999-12-31', '2999-12-31');
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender, income,
                                  income_due, country_id, receives_familybonus)
values (1011, NOW(), NOW(), 101, 'Child 1', 'Musterfrau', '2000-01-01', 'FEMALE', 500, '2999-12-31', 1, false);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender, employer,
                                  income,
                                  income_due, country_id, receives_familybonus)
values (1012, NOW(), NOW(), 101, 'Child 2', 'Musterfrau', CURRENT_DATE - interval '2 year', 'FEMALE', 'Stadt Wien', null, null, 1,
        true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender, employer,
                                  income,
                                  income_due, country_id, receives_familybonus, exclude_household)
values (1013, NOW(), NOW(), 101, 'Child 3', 'Musterfrau', CURRENT_DATE - interval '2 year', 'MALE', 'WRK', null, null, 1, true,
        true);
INSERT INTO customers_notes (id, created_at, updated_at, customer_id, employee_id, note)
VALUES (1003, NOW(), NOW(), 101, 100,
        'Testnote 3.<br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.<br/><br/>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.');
INSERT INTO customers_notes (id, created_at, updated_at, customer_id, employee_id, note)
VALUES (1002, NOW(), NOW(), 101, 100, 'Testnote 2');
INSERT INTO customers_notes (id, created_at, updated_at, customer_id, employee_id, note)
VALUES (1001, NOW(), NOW(), 101, null, 'Testnote 1');

INSERT INTO customers (id, created_at, updated_at, customer_id, employee_id, firstname, lastname, birth_date, gender, country_id,
                       address_street, address_houseNumber, address_stairway, address_door, address_postalCode,
                       address_city, telephone_number, email, employer, income, income_due, valid_until)
values (102, NOW(), NOW(), 102, 100, 'John', 'Doe', '1980-01-01', 'MALE', 1, 'Erdberg', 1, null, null, '1030', 'Wien',
        null, null, 'Stadt Wien', 123.00, '2999-12-31', '2999-12-31');
INSERT INTO customers (id, created_at, updated_at, customer_id, employee_id, firstname, lastname, birth_date, gender, country_id,
                       address_street, address_houseNumber, address_stairway, address_door, address_postalCode,
                       address_city, telephone_number, email, employer, income, income_due, valid_until)
values (103, NOW(), NOW(), 103, 100, 'John Doe', 'EXPIRES SOON', '1980-01-01', 'MALE', 1, 'Erdberg', 1, null, null, '1030',
        'Wien',
        null, null, 'Stadt Wien', 123.00, NOW() + interval '1 month', NOW() + interval '1 month');
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender, income,
                                  income_due, country_id, receives_familybonus)
values (1031, NOW(), NOW(), 103, 'Child 1', 'Musterfrau', CURRENT_DATE - interval '1 year', null, 500, '2999-12-31', 1, false);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender, employer,
                                  income,
                                  income_due, country_id, receives_familybonus)
values (1032, NOW(), NOW(), 103, 'Child 2', 'Musterfrau', CURRENT_DATE - interval '2 year', null, 'Stadt Wien', null, null, 1,
        true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender, employer,
                                  income,
                                  income_due, country_id, receives_familybonus, exclude_household)
values (1033, NOW(), NOW(), 103, 'Child 3', 'Musterfrau', CURRENT_DATE - interval '3 year', 'FEMALE', 'WRK', null, null, 1, true,
        true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender, employer,
                                  income,
                                  income_due, country_id, receives_familybonus, exclude_household)
values (1034, NOW(), NOW(), 103, 'Child 4', 'Musterfrau', CURRENT_DATE - interval '4 year', 'FEMALE', 'WRK', null, null, 1, true,
        true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender, employer,
                                  income,
                                  income_due, country_id, receives_familybonus, exclude_household)
values (1035, NOW(), NOW(), 103, 'Child 5', 'Musterfrau', CURRENT_DATE - interval '5 year', 'MALE', 'WRK', null, null, 1, true,
        true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender, employer,
                                  income,
                                  income_due, country_id, receives_familybonus, exclude_household)
values (1036, NOW(), NOW(), 103, 'Child 6', 'Musterfrau', CURRENT_DATE - interval '6 year', 'MALE', 'WRK', null, null, 1, true,
        true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender, employer,
                                  income,
                                  income_due, country_id, receives_familybonus, exclude_household)
values (1037, NOW(), NOW(), 103, 'Child 7', 'Musterfrau', CURRENT_DATE - interval '7 year', 'MALE', 'WRK', null, null, 1, true,
        true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender, employer,
                                  income,
                                  income_due, country_id, receives_familybonus, exclude_household)
values (1038, NOW(), NOW(), 103, 'Child 8', 'Musterfrau', CURRENT_DATE - interval '8 year', 'MALE', 'WRK', null, null, 1, true,
        true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender, employer,
                                  income,
                                  income_due, country_id, receives_familybonus, exclude_household)
values (1039, NOW(), NOW(), 103, 'Child 9', 'Musterfrau', CURRENT_DATE - interval '9 year', 'MALE', 'WRK', null, null, 1, true,
        true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender, employer,
                                  income,
                                  income_due, country_id, receives_familybonus, exclude_household)
values (1040, NOW(), NOW(), 103, 'Child 10', 'Musterfrau', CURRENT_DATE - interval '10 year', 'MALE', 'WRK', null, null, 1, true,
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

INSERT INTO customers (id, created_at, updated_at, customer_id, employee_id, firstname, lastname, birth_date, gender, country_id,
                       address_street, address_houseNumber, address_stairway, address_door, address_postalCode,
                       address_city, telephone_number, email, employer, income, income_due, valid_until)
values (104, NOW(), NOW(), 104, 100, 'Jane Doe', 'EXPIRED', '1980-01-01', 'FEMALE', 1, 'Erdberg', 1, null, null, '1030', 'Wien',
        null, null, 'Stadt Wien', 123.00, '2000-12-31', '2000-12-31');
INSERT INTO customers (id, created_at, updated_at, customer_id, employee_id, firstname, lastname, birth_date, gender, country_id,
                       address_street, address_houseNumber, address_stairway, address_door, address_postalCode,
                       address_city, telephone_number, email, employer, income, income_due, valid_until, locked,
                       locked_at, locked_by, lock_reason)
values (105, NOW(), NOW(), 105, 100, 'Jane Doe', 'LOCKED', '1980-01-01', 'FEMALE', 1, 'Erdberg', 1, null, null, '1030', 'Wien',
        null, null, 'Stadt Wien', 123.00, '2999-12-31', '2999-12-31', true, NOW(), 100,
        'Lock-Reason: Lorem ipsum dolor sit amet');
INSERT INTO customers (id, created_at, updated_at, customer_id, employee_id, firstname, lastname, birth_date, gender, country_id,
                       address_street, address_houseNumber, address_stairway, address_door, address_postalCode,
                       address_city, telephone_number, email, employer, income, income_due, valid_until, locked,
                       locked_at, locked_by, lock_reason)
values (106, NOW(), NOW(), 106, null, null, null, null, null, 1, null, null, null, null, null, null,
        null, null, null, null, null, NOW(), false, null, null, null);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender, employer,
                                  income, income_due, country_id, receives_familybonus, exclude_household)
values (1060, NOW(), NOW(), 106, 'Firstname 1', 'Lastname 1', null, null, null, null, null, 1, true, true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender, employer,
                                  income, income_due, country_id, receives_familybonus, exclude_household)
values (1061, NOW(), NOW(), 106, 'Firstname 2', 'Lastname 2', null, null, null, null, null, 1, false, false);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender, employer,
                                  income, income_due, country_id, receives_familybonus, exclude_household)
values (1062, NOW(), NOW(), 106, 'Firstname 3', 'Lastname 3', null, null, null, null, null, 1, true, false);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender, employer,
                                  income, income_due, country_id, receives_familybonus, exclude_household)
values (1063, NOW(), NOW(), 106, 'Firstname 4', 'Lastname 4', null, null, null, null, null, 1, false, true);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, gender, employer,
                                  income, income_due, country_id, receives_familybonus, exclude_household)
values (1064, NOW(), NOW(), 106, 'Firstname 5', 'Lastname 5', null, null, null, null, null, 1, false, false);

-- static values
DELETE FROM static_values;

-- income limits
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_adult, count_child)
VALUES (1, NOW(), NOW(), 'INCOME-LIMIT', '1900-01-01', '2999-12-31', 1328.00, 1, 0);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_adult, count_child)
VALUES (2, NOW(), NOW(), 'INCOME-LIMIT', '1900-01-01', '2999-12-31', 1726.00, 1, 1);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_adult, count_child)
VALUES (3, NOW(), NOW(), 'INCOME-LIMIT', '1900-01-01', '2999-12-31', 2124.00, 1, 2);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_adult, count_child)
VALUES (4, NOW(), NOW(), 'INCOME-LIMIT', '1900-01-01', '2999-12-31', 1992.00, 2, 0);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_adult, count_child)
VALUES (5, NOW(), NOW(), 'INCOME-LIMIT', '1900-01-01', '2999-12-31', 2390.00, 2, 1);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_adult, count_child)
VALUES (6, NOW(), NOW(), 'INCOME-LIMIT', '1900-01-01', '2999-12-31', 2788.00, 2, 2);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_adult, count_child)
VALUES (7, NOW(), NOW(), 'INCOME-LIMIT', '1900-01-01', '2999-12-31', 3187.00, 2, 3);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, additional_adult)
VALUES (8, NOW(), NOW(), 'INCOME-LIMIT', '1900-01-01', '2999-12-31', 664.00, true);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, additional_child)
VALUES (9, NOW(), NOW(), 'INCOME-LIMIT', '1900-01-01', '2999-12-31', 398.00, true);

-- income tolerance
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount)
VALUES (10, NOW(), NOW(), 'INCOME-TOLERANCE', '1900-01-01', '2999-12-31', 100.00);

-- family bonus
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, age)
VALUES (11, NOW(), NOW(), 'FAMILY-BONUS', '1900-01-01', '2999-12-31', 114.00, 0);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, age)
VALUES (12, NOW(), NOW(), 'FAMILY-BONUS', '1900-01-01', '2999-12-31', 121.90, 3);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, age)
VALUES (13, NOW(), NOW(), 'FAMILY-BONUS', '1900-01-01', '2999-12-31', 141.50, 10);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, age)
VALUES (14, NOW(), NOW(), 'FAMILY-BONUS', '1900-01-01', '2999-12-31', 165.10, 19);

-- child tax allowance
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount)
VALUES (15, NOW(), NOW(), 'CHILD-TAX-ALLOWANCE', '1900-01-01', '2999-12-31', 58.40);

-- sibling addition
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_child)
VALUES (16, NOW(), NOW(), 'SIBLING-ADDITION', '1900-01-01', '2999-12-31', 7.10, 2);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_child)
VALUES (17, NOW(), NOW(), 'SIBLING-ADDITION', '1900-01-01', '2999-12-31', 17.40, 3);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_child)
VALUES (18, NOW(), NOW(), 'SIBLING-ADDITION', '1900-01-01', '2999-12-31', 26.50, 4);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_child)
VALUES (19, NOW(), NOW(), 'SIBLING-ADDITION', '1900-01-01', '2999-12-31', 32.00, 5);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_child)
VALUES (20, NOW(), NOW(), 'SIBLING-ADDITION', '1900-01-01', '2999-12-31', 35.70, 6);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, amount, count_child)
VALUES (21, NOW(), NOW(), 'SIBLING-ADDITION', '1900-01-01', '2999-12-31', 52.00, 7);

-- distribution-related
INSERT INTO distributions (id, created_at, updated_at, started_at, ended_at, startedby_userid, endedby_userid)
VALUES (100, NOW(), NOW(), '2023-07-01 14:00:00.000000', '2023-07-01 23:00:00.000000', 300, 300);
INSERT INTO distributions_statistics (id, created_at, updated_at, distribution_id, count_customers,
                                      count_persons, count_infants, average_persons_per_customer,
                                      count_customers_new, count_persons_new,
                                      count_customers_prolonged, count_persons_prolonged,
                                      count_customers_updated)
VALUES (100, NOW(), NOW(), 100, 50, 125, 40, 2.5, 4, 5, 6, 7, 8);

-- shops
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city)
VALUES (1, NOW(), NOW(), 100, 'Billa', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Bloch-Bauer-promenade 1', 1100, 'Wien');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city)
VALUES (2, NOW(), NOW(), 200, 'Billa Plus', '01 23 45 67 89',
        'DW 123 od. 456', 'Hr. Mustermann', 'Herzgasse 2', 1110, 'Wien');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city)
VALUES (3, NOW(), NOW(), 300, 'Hofer', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city)
VALUES (4, NOW(), NOW(), 400, 'Hofer 2', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city)
VALUES (5, NOW(), NOW(), 500, 'Hofer 3', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city)
VALUES (6, NOW(), NOW(), 600, 'Hofer 4', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city)
VALUES (7, NOW(), NOW(), 700, 'Hofer 5', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city)
VALUES (8, NOW(), NOW(), 800, 'Hofer 6', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city)
VALUES (9, NOW(), NOW(), 900, 'Hofer 7', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city)
VALUES (10, NOW(), NOW(), 1000, 'Hofer 8', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city)
VALUES (11, NOW(), NOW(), 1100, 'Hofer 9', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city)
VALUES (12, NOW(), NOW(), 1200, 'Denns Biomarkt 10', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city)
VALUES (13, NOW(), NOW(), 1300, 'Hofer 11', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city)
VALUES (14, NOW(), NOW(), 1400, 'Hofer 12', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city)
VALUES (15, NOW(), NOW(), 1500, 'Hofer 13', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Quellenstraße 3', 1120, 'Wien');

INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city)
VALUES (20, NOW(), NOW(), 2000, 'Lidl', '01 23 45 67 89', null,
        'Hr. Mustermann', 'Kudlichgasse 4', 1130, 'Wien');
INSERT INTO shops (id, created_at, updated_at, number, name, phone, note, contact_person, address_street,
                   address_postal_code, address_city)
VALUES (21, NOW(), NOW(), 2100, 'Denns BioMarkt', '01 23 45 67 89', null,
        'Fr. Musterfrau', 'Simmeringer Hauptstraße 5', 1140, 'Wien');

-- routes
INSERT INTO routes (id, created_at, updated_at, number, name, note)
VALUES (1, NOW(), NOW(), 1, 'Route 1', 'Note 1');

INSERT INTO routes (id, created_at, updated_at, number, name, note)
VALUES (2, NOW(), NOW(), 2, 'Route 2', null);

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

INSERT INTO routes_stops (id, created_at, updated_at, route_id, shop_id, time)
VALUES (210, NOW(), NOW(), 2, 21, '12:15:00');

-- food categories
INSERT INTO food_categories (id, created_at, updated_at, name)
VALUES (1, NOW(), NOW(), 'Backwaren');
INSERT INTO food_categories (id, created_at, updated_at, name)
VALUES (2, NOW(), NOW(), 'Obst / Gemüse');
INSERT INTO food_categories (id, created_at, updated_at, name)
VALUES (3, NOW(), NOW(), 'Milchprodukte');
INSERT INTO food_categories (id, created_at, updated_at, name)
VALUES (4, NOW(), NOW(), 'Getränke');
INSERT INTO food_categories (id, created_at, updated_at, name)
VALUES (5, NOW(), NOW(), 'Fertiggerichte');
INSERT INTO food_categories (id, created_at, updated_at, name)
VALUES (6, NOW(), NOW(), 'Fleisch / Fisch');
INSERT INTO food_categories (id, created_at, updated_at, name)
VALUES (7, NOW(), NOW(), 'Konserven');
INSERT INTO food_categories (id, created_at, updated_at, name)
VALUES (8, NOW(), NOW(), 'Süßwaren');
INSERT INTO food_categories (id, created_at, updated_at, name)
VALUES (9, NOW(), NOW(), 'Tiefkühlprodukte');
INSERT INTO food_categories (id, created_at, updated_at, name)
VALUES (10, NOW(), NOW(), 'Sonstiges');
INSERT INTO food_categories (id, created_at, updated_at, name)
VALUES (11, NOW(), NOW(), 'Graue Kisten');
INSERT INTO food_categories (id, created_at, updated_at, name)
VALUES (12, NOW(), NOW(), 'Klappkisten schwarz');
INSERT INTO food_categories (id, created_at, updated_at, name)
VALUES (13, NOW(), NOW(), 'Grüne Kisten');
INSERT INTO food_categories (id, created_at, updated_at, name)
VALUES (14, NOW(), NOW(), 'Ströck Kisten');
INSERT INTO food_categories (id, created_at, updated_at, name)
VALUES (15, NOW(), NOW(), 'sonstige Kisten');

-- distributions
INSERT INTO distributions (id, created_at, updated_at, started_at, ended_at, startedby_userid, endedby_userid)
VALUES (1, NOW(), NOW(), '2000-01-01 17:00:00.000000', '2000-01-01 22:00:00.000000', 300, 300);

-- other employees
INSERT INTO employees (id, created_at, updated_at, personnel_number, firstname, lastname)
VALUES (2000, NOW(), NOW(), '02000', 'Driver', '1');
INSERT INTO employees (id, created_at, updated_at, personnel_number, firstname, lastname)
VALUES (2100, NOW(), NOW(), '02100', 'CoDriver', '1');

-- food collections
INSERT INTO food_collections (id, created_at, updated_at, distribution_id, route_id, car_license_plate,
                              driver_employee_id, co_driver_employee_id, km_start, km_end)
VALUES (1, NOW(), NOW(), 1, 1, 'W-NICECAR-123', 2000, 2100, 213000, 213500);

-- food collections items for route 1
WITH ShopCategories AS (
    SELECT s.id AS shop_id, fc.id AS food_category_id
    FROM shops s
             CROSS JOIN food_categories fc
),
     RandomAmounts AS (
         SELECT generate_series(1, 10) AS amount
     )
INSERT INTO food_collections_items (
    food_collection_id,
    shop_id,
    food_category_id,
    amount
)
SELECT
    1,  -- fixed collection 1
    sc.shop_id,
    sc.food_category_id,
    sc.shop_id -- using same as amount
FROM
    ShopCategories sc;
