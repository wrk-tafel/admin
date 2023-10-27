-- Executed manually due to missing permissions
-- create extension if not exists fuzzystrmatch;

create index if not exists soundex_firstname ON customers (soundex(firstname));
create index if not exists soundex_lastname ON customers (soundex(lastname));
