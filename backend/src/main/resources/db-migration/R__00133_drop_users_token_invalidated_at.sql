-- A login is a row in spring_session (R__00132, ADR-0070), and ending one deletes that row, so the
-- "every token issued before this moment is invalid" cut-off that R__00109 added has nothing left
-- to cut off.
alter table users
    drop column if exists token_invalidated_at;
