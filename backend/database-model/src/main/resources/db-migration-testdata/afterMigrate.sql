DROP FUNCTION IF EXISTS truncate_tables;
CREATE OR REPLACE FUNCTION truncate_tables(username IN VARCHAR) RETURNS void AS $$
DECLARE
    statements CURSOR FOR
        SELECT tablename FROM pg_tables
        WHERE tableowner = username AND schemaname = 'public' AND tablename <> 'flyway_schema_history';
BEGIN
    FOR stmt IN statements LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(stmt.tablename) || ' CASCADE;';
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT truncate_tables('tafeladmin');

-- pwd: 35bc40681124f412c5d052366edb9eb9
INSERT INTO users (username, password, enabled) VALUES ('testuser', '$argon2id$v=19$m=16,t=2,p=1$MzViYzQwNjgxMTI0ZjQxMmM1ZDA1MjM2NmVkYjllYjk$Lf4rs14B9IfNmou71DMRTQ', true);
INSERT INTO authorities (username, authority) VALUES ('testuser', 'CUSTOMER');

-- TODO remove | fake user with weak password to gain some intrusion insights
-- pwd: 12345
INSERT INTO users (username, password, enabled) VALUES ('admin', '$argon2id$v=19$m=16,t=2,p=1$YWRzYWRzYWRzYWRzYWRzYWRzYWQ$L/OMN2YcZCB9YGhFIM1ASg', true);
INSERT INTO authorities (username, authority) VALUES ('admin', 'TEST_AUTHORITY');

-- customers
INSERT INTO customers (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, address_street, address_housenumber, address_stairway, address_postcode, address_city, telephone_number, email, count_persons_in_household, count_infants) values
(0, NOW(), NOW(), 0, 'Max', 'Mustermann', '1980-01-01', 'Erdberg', 1, '2', '1030', 'Wien', 00436641231234, 'max.mustermann@wrk.at', 3, 1);
INSERT INTO customers (id, created_at, updated_at, customer_id, firstname, lastname, birth_date, address_street, address_housenumber, address_stairway, address_postcode, address_city, telephone_number, email, count_persons_in_household, count_infants) values
(1, NOW(), NOW(), 1, 'Eva', 'Musterfrau', '1990-01-01', 'Erdberg', 2, '1', '1010', 'Wien', 00436645678953, 'eva.musterfrau@wrk.at', 2, 0);

-- static values
-- income limits
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, count_adult, count_child) VALUES
(1, NOW(), NOW(), 'INCOME-LIMIT', '1900-01-01', '2999-12-31', 1328.00, 1, 0);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, count_adult, count_child) VALUES
(2, NOW(), NOW(), 'INCOME-LIMIT', '1900-01-01', '2999-12-31', 1726.00, 1, 1);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, count_adult, count_child) VALUES
(3, NOW(), NOW(), 'INCOME-LIMIT', '1900-01-01', '2999-12-31', 2124.00, 1, 2);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, count_adult, count_child) VALUES
(4, NOW(), NOW(), 'INCOME-LIMIT', '1900-01-01', '2999-12-31', 1992.00, 2, 0);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, count_adult, count_child) VALUES
(5, NOW(), NOW(), 'INCOME-LIMIT', '1900-01-01', '2999-12-31', 2390.00, 2, 1);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, count_adult, count_child) VALUES
(6, NOW(), NOW(), 'INCOME-LIMIT', '1900-01-01', '2999-12-31', 2788.00, 2, 2);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, count_adult, count_child) VALUES
(7, NOW(), NOW(), 'INCOME-LIMIT', '1900-01-01', '2999-12-31', 3187.00, 2, 3);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, additional_adult) VALUES
(8, NOW(), NOW(), 'INCOME-LIMIT', '1900-01-01', '2999-12-31', 664.00, true);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, additional_child) VALUES
(9, NOW(), NOW(), 'INCOME-LIMIT', '1900-01-01', '2999-12-31', 398.00, true);

-- income tolerance
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value) VALUES
(10, NOW(), NOW(), 'INCOME-TOLERANCE', '1900-01-01', '2999-12-31', 100.00);

-- family bonus
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, age) VALUES
(11, NOW(), NOW(), 'FAMILY-BONUS', '1900-01-01', '2999-12-31', 114.00, 0);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, age) VALUES
(12, NOW(), NOW(), 'FAMILY-BONUS', '1900-01-01', '2999-12-31', 121.90, 3);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, age) VALUES
(13, NOW(), NOW(), 'FAMILY-BONUS', '1900-01-01', '2999-12-31', 141.50, 10);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, age) VALUES
(14, NOW(), NOW(), 'FAMILY-BONUS', '1900-01-01', '2999-12-31', 165.10, 19);

-- child tax allowance
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value) VALUES
(15, NOW(), NOW(), 'CHILD-TAX-ALLOWANCE', '1900-01-01', '2999-12-31', 58.40);

-- sibling addition
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, count_child) VALUES
(16, NOW(), NOW(), 'SIBLING-ADDITION', '1900-01-01', '2999-12-31', 7.10, 2);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, count_child) VALUES
(17, NOW(), NOW(), 'SIBLING-ADDITION', '1900-01-01', '2999-12-31', 17.40, 3);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, count_child) VALUES
(18, NOW(), NOW(), 'SIBLING-ADDITION', '1900-01-01', '2999-12-31', 26.50, 4);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, count_child) VALUES
(19, NOW(), NOW(), 'SIBLING-ADDITION', '1900-01-01', '2999-12-31', 32.00, 5);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, count_child) VALUES
(20, NOW(), NOW(), 'SIBLING-ADDITION', '1900-01-01', '2999-12-31', 35.70, 6);
INSERT INTO static_values(id, created_at, updated_at, type, valid_from, valid_to, value, count_child) VALUES
(21, NOW(), NOW(), 'SIBLING-ADDITION', '1900-01-01', '2999-12-31', 52.00, 7);
