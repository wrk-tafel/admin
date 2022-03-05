DROP FUNCTION IF EXISTS truncate_tables;
CREATE OR REPLACE FUNCTION truncate_tables(username IN VARCHAR) RETURNS void AS $$
DECLARE
    statements CURSOR FOR
        SELECT tablename FROM pg_tables
        WHERE tableowner = username AND schemaname = 'public';
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
INSERT INTO static_values(id, created_at, updated_at, type, value, valid_from, valid_to) VALUES
(1, NOW(), NOW(), 'PERS1', 1328.00, '1900-01-01', '2999-12-31');
INSERT INTO static_values(id, created_at, updated_at, type, value, valid_from, valid_to) VALUES
(2, NOW(), NOW(), 'PERS1CH1', 1726.00, '1900-01-01', '2999-12-31');
INSERT INTO static_values(id, created_at, updated_at, type, value, valid_from, valid_to) VALUES
(3, NOW(), NOW(), 'PERS1CH2', 2124.00, '1900-01-01', '2999-12-31');
INSERT INTO static_values(id, created_at, updated_at, type, value, valid_from, valid_to) VALUES
(4, NOW(), NOW(), 'PERS2', 1992.00, '1900-01-01', '2999-12-31');
INSERT INTO static_values(id, created_at, updated_at, type, value, valid_from, valid_to) VALUES
(5, NOW(), NOW(), 'PERS2CH1', 2390.00, '1900-01-01', '2999-12-31');
INSERT INTO static_values(id, created_at, updated_at, type, value, valid_from, valid_to) VALUES
(6, NOW(), NOW(), 'PERS2CH2', 2788.00, '1900-01-01', '2999-12-31');
INSERT INTO static_values(id, created_at, updated_at, type, value, valid_from, valid_to) VALUES
(7, NOW(), NOW(), 'PERS2CH3', 3187.00, '1900-01-01', '2999-12-31');
INSERT INTO static_values(id, created_at, updated_at, type, value, valid_from, valid_to) VALUES
(8, NOW(), NOW(), 'ADDADULT', 664.00, '1900-01-01', '2999-12-31');
INSERT INTO static_values(id, created_at, updated_at, type, value, valid_from, valid_to) VALUES
(9, NOW(), NOW(), 'ADDCHILD', 398.00, '1900-01-01', '2999-12-31');
