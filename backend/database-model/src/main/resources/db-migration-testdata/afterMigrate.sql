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
