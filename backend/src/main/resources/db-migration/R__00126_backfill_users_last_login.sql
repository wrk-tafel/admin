-- An account that has never had a login recorded is measured from its creation date by
-- UserRetentionService (see UserRepository.findExpiredUserIdsSkipLocked), and last_login (added in
-- R__00105) is still empty for accounts that have not logged in since that column existed. Their
-- creation date says nothing about whether they are used, and with a one-year retention window it
-- would delete every long-lived account whose owner only logs in a few times a year on the first
-- nightly run.
--
-- So every account without a recorded login starts its retention clock now: it is treated as having
-- logged in at the moment this script runs, and is deleted only if it then stays unused for the whole
-- window. Runs once; an account created afterwards keeps a null last_login until its first login, and
-- is measured from its creation date as before. Re-running it only moves the clock of accounts that
-- still have no recorded login.
update users
set last_login = now()
where last_login is null;
