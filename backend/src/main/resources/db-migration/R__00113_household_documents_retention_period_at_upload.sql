-- Stamps the tafeladmin.householdDeletion.retentionTime value that was live when a document was
-- uploaded (DocumentEntity.retentionPeriodAtUpload, stored as Period.toString()'s canonical ISO-8601
-- text, e.g. "P7Y"), so a later config change can be detected against what a signed-and-filed
-- PRIVACY_NOTICE document actually states - see issue #3500. Only meaningful for PRIVACY_NOTICE
-- documents; every other document type is stamped null and stays null. Documents uploaded before
-- this migration have no stamped value and can never be flagged as drifted - they predate the
-- ability to tell.

alter table household_documents
    add column if not exists retention_period_at_upload varchar(50);
