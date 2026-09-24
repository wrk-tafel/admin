-- The address a system notification to one user is sent to, and where a two-factor code is mailed
-- to. Optional: an existing account has none until someone enters it under Benutzer.

alter table users add column if not exists email varchar(255);
