# ADR-0050: The documents tab gets its own permission, separate from CUSTOMER

**Status:** accepted · **Recorded:** 2026-08-25

## Context

`CUSTOMER` grants read and write on every household, every note, every income figure and every
uploaded ID scan or proof of income. `HouseholdDocumentController` and `DocumentScannerController`
required it once at class level, alongside `HouseholdController`'s own core endpoints. Check-in
staff who only need to confirm that a household number is valid held the same access as the person
doing the income assessment.

`docs/architecture/gdpr-compliance.md`'s gap G7 (Art. 5(1)(c), Art. 32(1)(b)) flagged this as a
decision nobody had recorded rather than a defect: a single `CUSTOMER` flag may well be proportionate
for a team this size, but the uploaded ID scans and proofs of income are the most sensitive
artefacts the application stores, and `HouseholdDocumentController`/`DocumentScannerController`
being annotated at class level meant the split was cheap - one permission, one guard in the
frontend, and the tab hidden when it is absent (issue #3181).

## Decision

**`CUSTOMER_DOCUMENTS` is a new, independent permission. Holding `CUSTOMER` no longer implies it.**

- `UserPermissions.kt` adds `CUSTOMER_DOCUMENTS` ("Kunden-Dokumente"), documented as deliberately not
  implied by `CUSTOMER`.
- `HouseholdDocumentController` and `DocumentScannerController` now require
  `hasAuthority('CUSTOMER_DOCUMENTS')` instead of `hasAuthority('CUSTOMER')` - the same pattern
  `CUSTOMER_DUPLICATES`/`CUSTOMERS_ABOVE_LIMIT`/`CUSTOMERS_OVERVIEW` already use for their own
  narrower slices of the customer feature.
- The customer detail screen's "Dokumente" tab (`customer-detail.component.html`) is now behind
  `hasDocumentsPermission()`, the same pattern the "Verlauf" (audit) tab already uses for
  `AUDIT_LOG`. `CustomerDocumentsResolver` checks the permission itself before calling the backend,
  so a user without it gets an empty resolved list (and therefore no error breaking the rest of the
  page's navigation) instead of a 403 from the route resolver.
- `R__00107_customer_documents_permission.sql` backfills `CUSTOMER_DOCUMENTS` onto every user who
  already held `CUSTOMER` at deploy time, so nobody's access changes the moment this ships. It is a
  one-time copy, not an ongoing rule - granting `CUSTOMER` to a new user from here on does not also
  grant `CUSTOMER_DOCUMENTS`; that is now a deliberate second step for whoever administers users.

## Consequences

- The documents tab and the scanner-file import are reachable by strictly fewer people than before
  this change ships, for everyone administered after the backfill. Whoever manages users has to
  grant `CUSTOMER_DOCUMENTS` explicitly for a new hire who needs it - a step that did not exist
  before.
- `ADMINISTRATOR` is unaffected: `JwtTokenService` still expands it to every permission, including
  the new one.
- Two permissions must now be kept in sync by hand wherever both matter (e.g. this ADR's own
  backfill, or a future test fixture) - there is no code path that derives one from the other,
  matching the existing `CUSTOMER_DUPLICATES`/`CUSTOMERS_ABOVE_LIMIT`/`CUSTOMERS_OVERVIEW` precedent.
- G7 itself does not name who should hold the narrower permission going forward - that operator
  decision (`docs/architecture/gdpr-compliance.md` §6, issue #3185) is unchanged by this ADR; what
  changes is that the choice is now enforceable per user instead of impossible to express.

## Alternatives considered

- **Leave `CUSTOMER` as the single flag and record that as the deliberate choice.** This is the
  alternative G7 itself offered ("if the answer is 'one flag is right for us', record that in an
  ADR"). Rejected because the split was cheap to make (two controllers, one frontend guard) and
  removes a real gap rather than just documenting it.
- **A read-only "view documents" permission separate from a "manage documents" (upload/delete) one.**
  Rejected for now as more granularity than the two controllers currently support - both are
  annotated at class level with no read/write split, and introducing one would touch every endpoint
  on both controllers for a distinction nobody has asked for yet. Revisit if a concrete need for
  read-only document access shows up.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/auth/model/UserPermissions.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/household/internal/document/HouseholdDocumentController.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/household/internal/document/DocumentScannerController.kt`
- `backend/src/main/resources/db-migration/R__00107_customer_documents_permission.sql`
- `frontend/src/main/webapp/src/app/modules/customer/views/customer-detail/customer-detail.component.ts`
- `frontend/src/main/webapp/src/app/modules/customer/resolver/customerdocuments-resolver.component.ts`
- `docs/architecture/gdpr-compliance.md` (G7)
- [#3181](https://github.com/wrk-tafel/admin/issues/3181), part of the GDPR review from #3124
