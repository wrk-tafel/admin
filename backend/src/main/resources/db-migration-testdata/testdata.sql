-- adapt sequences
SELECT setval('customer_id_sequence', 10000, false);
SELECT setval('hibernate_sequence', 5000, false);

-- user e2etest for cypress tests
-- pwd: e2etest
INSERT INTO users (id, created_at, updated_at, username, password, enabled, personnel_number, firstname, lastname)
VALUES (100, NOW(), NOW(), 'e2etest', '{argon2}$argon2id$v=19$m=4096,t=3,p=1$Cnj0ayQKhOPbkomIRV5tnQ$BfU/uOr20/vg9ie0CQcWhCD00DqjPDf6UI0pRvz1/gg', true,
        '00000', 'E2E', 'Test');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (1000, NOW(), NOW(), 100, 'CUSTOMER');

-- user e2etest2 for cypress test (password change)
-- pwd: e2etest
INSERT INTO users (id, created_at, updated_at, username, password, enabled, personnel_number, firstname, lastname)
VALUES (101, NOW(), NOW(), 'e2etest2', '{argon2}$argon2id$v=19$m=4096,t=3,p=1$Cnj0ayQKhOPbkomIRV5tnQ$BfU/uOr20/vg9ie0CQcWhCD00DqjPDf6UI0pRvz1/gg', true,
        '00000-2', 'E2E', 'Test 2');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (1010, NOW(), NOW(), 101, 'CUSTOMER');

-- user e2etest3 for cypress test (password change)
-- pwd: e2etest
INSERT INTO users (id, created_at, updated_at, username, password, enabled, personnel_number, firstname, lastname, passwordchange_required)
VALUES (102, NOW(), NOW(), 'e2etest3', '{argon2}$argon2id$v=19$m=4096,t=3,p=1$Cnj0ayQKhOPbkomIRV5tnQ$BfU/uOr20/vg9ie0CQcWhCD00DqjPDf6UI0pRvz1/gg', true,
        '00000-3', 'E2E', 'Test 3', true);
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (1020, NOW(), NOW(), 102, 'CUSTOMER');

-- pwd: 35bc40681124f412c5d052366edb9eb9
INSERT INTO users (id, created_at, updated_at, username, password, enabled, personnel_number, firstname, lastname)
VALUES (200, NOW(), NOW(), 'testuser',
        '{argon2}$argon2id$v=19$m=4096,t=3,p=1$DZTJhKdC4/5fzGDI2CtozA$ELfBRSqAKes7ThqkzL7AN6JkEq7wzWgKejhLQ02XD6c', true,
        '0200', 'Test', 'User');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (2000, NOW(), NOW(), 200, 'CUSTOMER');

-- TODO remove | fake user with weak password to gain some intrusion insights
-- pwd: 12345
INSERT INTO users (id, created_at, updated_at, username, password, enabled, personnel_number, firstname, lastname)
VALUES (300, NOW(), NOW(), 'admin', '{argon2}$argon2id$v=19$m=4096,t=3,p=1$RXn6Xt/0q/Wtrvdns6NUnw$X3xWUjENAbNSJNckeVFXWrjkoFSowwlu3xHx1/zb40w',
        true,
        '0300', 'AD', 'min');
INSERT INTO users_authorities (id, created_at, updated_at, user_id, name)
VALUES (3000, NOW(), NOW(), 300, 'CUSTOMER');

-- customers
INSERT INTO customers (id, created_at, updated_at, customer_id, user_id, firstname, lastname, birth_date, country_id,
                       address_street, address_houseNumber, address_stairway, address_door, address_postalCode,
                       address_city, telephone_number, email, employer, income, income_due, valid_until)
values (0, NOW(), NOW(), 100, 100, 'Max Single', 'Mustermann', '1980-01-01', 1, 'Erdberg', 1, null, null, '1030', 'Wien',
        null, null, 'Stadt Wien', 123.00, '2999-12-31', '2999-12-31');
INSERT INTO customers (id, created_at, updated_at, customer_id, user_id, firstname, lastname, birth_date, country_id,
                       address_street, address_houseNumber, address_stairway, address_door, address_postalCode,
                       address_city, telephone_number, email, employer, income, income_due, valid_until)
values (1, NOW(), NOW(), 101, 100, 'Eva', 'Musterfrau', '1990-01-01', 2, 'Erdberg', 2, '1', '20', '1010', 'Wien',
        '00436645678953', 'eva.musterfrau@wrk.at', 'Rotes Kreuz Wien', 456.00, '2999-12-31', '2999-12-31');
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, income,
                                  income_due)
values (1, NOW(), NOW(), 1, 'Child 1', 'Musterfrau', '2000-01-01', 500, '2999-12-31');
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, income,
                                  income_due)
values (2, NOW(), NOW(), 1, 'Child 2', 'Musterfrau', '2020-01-01', 0, null);
INSERT INTO customers_addpersons (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, income,
                                  income_due)
values (3, NOW(), NOW(), 1, 'Child 3', 'Musterfrau', '2020-01-01', null, null);
INSERT INTO customers (id, created_at, updated_at, customer_id, user_id, firstname, lastname, birth_date, country_id,
                       address_street, address_houseNumber, address_stairway, address_door, address_postalCode,
                       address_city, telephone_number, email, employer, income, income_due, valid_until)
values (4, NOW(), NOW(), 201, 100, '1', 'e2esearch', '1980-01-01', 1, 'Erdberg', 1, null, '10', '1030', 'Wien', null, null,
        'Stadt Wien', 123.00, '2999-12-31', '2999-12-31');
INSERT INTO customers (id, created_at, updated_at, customer_id, user_id, firstname, lastname, birth_date, country_id,
                       address_street, address_houseNumber, address_stairway, address_door, address_postalCode,
                       address_city, telephone_number, email, employer, income, income_due, valid_until)
values (5, NOW(), NOW(), 202, 100, '2', 'e2esearch', '1980-01-01', 1, 'Erdberg', 1, null, '10', '1030', 'Wien', null, null,
        'Stadt Wien', 123.00, '2999-12-31', '2999-12-31');

-- static values
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
