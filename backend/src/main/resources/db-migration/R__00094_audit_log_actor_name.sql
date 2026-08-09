-- The name behind the username on an audit entry.
--
-- Denormalized for the same reason actor_username is (see R__00093_audit_log.sql): there is no
-- foreign key to users(id), so an account being renamed, relinked to a different employee or
-- deleted must not change what an old entry says about who made that change. The name is stamped
-- from the acting user's employee record at write time and never updated afterwards.
--
-- Null on every row written before this column existed, and on writes no user is behind - the
-- screen falls back to the username, and to "System" when there is not even one.
alter table audit_log
    add column if not exists actor_firstname varchar(255);

alter table audit_log
    add column if not exists actor_lastname varchar(255);
