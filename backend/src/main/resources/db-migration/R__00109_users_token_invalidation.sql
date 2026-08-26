-- A JWT is validated only against the referenced user's current `enabled`/`passwordChangeRequired`
-- state (see TafelJwtAuthProvider), so a stolen or shared cookie kept working for the rest of its
-- lifetime even after the victim changed their password or explicitly logged out. This timestamp is
-- bumped to "now" on both events; TafelJwtAuthProvider then rejects any token whose `issuedAt` is
-- not strictly after it, on the same per-request DB reload it already does.
alter table if exists users
    add column if not exists token_invalidated_at timestamp;
