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

INSERT INTO users (username, password, enabled) VALUES ('test', '$argon2id$v=19$m=4096,t=3,p=1$fmhdC1kR4gJ8695c9JTgGg$FFyyNe/YNzAnwZQSj76gC9q9qAWDNkabxmpU9BKKSz4', true);
INSERT INTO authorities (username, authority) VALUES ('test', 'TEST_AUTHORITY');
