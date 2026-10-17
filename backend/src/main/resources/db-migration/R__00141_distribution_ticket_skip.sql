-- A ticket skipped on the ticket monitor control (issue #3871): its household wasn't there when it was
-- called. Skipping closes the ticket like processing it does, but without a paid/unpaid decision, so no
-- cost contribution is charged for it; "Ticket zurück" reopens it like any other.
alter table distributions_households
    add column if not exists skipped boolean not null default false;
