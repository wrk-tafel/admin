-- GDPR G7 (issue #3181): the documents tab (uploaded ID scans, proofs of income) and the document-
-- scanner-file import behind it now require their own CUSTOMER_DOCUMENTS permission instead of
-- being implied by CUSTOMER - see HouseholdDocumentController/DocumentScannerController and
-- UserPermissions.kt.
--
-- This is a one-time backfill, not an ongoing rule: every user who already held CUSTOMER also gets
-- CUSTOMER_DOCUMENTS, so nobody loses access to a screen they were using the moment this deploys.
-- Going forward the two permissions are independent - granting CUSTOMER to a new user does not grant
-- CUSTOMER_DOCUMENTS, that is now a deliberate second step for whoever administers users.
insert into users_authorities (id, created_at, updated_at, user_id, name)
select nextval('users_authorities_seq'), now(), now(), user_id, 'CUSTOMER_DOCUMENTS'
from users_authorities
where name = 'CUSTOMER'
on conflict (user_id, name) do nothing;
