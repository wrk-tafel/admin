-- What produced the mail (e.g. "Tagesreport", "Support-Anfrage"), so a mail that is later given up
-- on can be named without quoting its subject - see MailDeliveryFailedEvent and issue #3511. Nullable
-- because a row already queued before this migration ran was written without it.
alter table mail_outbox
    add column if not exists mail_type varchar(100);
