-- Which of the maintained mail types a queued mail is, so the e-mail settings screen can answer
-- "did yesterday's report actually go out?" without anyone reading the queue by hand.
-- Nullable: a mail that is not one of the types whose recipients are maintained in the UI - the
-- support request - has none.
alter table mail_outbox
    add column if not exists mail_type varchar(50);

-- The screen asks for the newest row of one mail type, which is what this index answers.
create index if not exists idx_mail_outbox_mail_type_id
    on mail_outbox (mail_type, id desc);
