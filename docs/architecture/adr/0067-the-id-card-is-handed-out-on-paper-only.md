# ADR-0067: The ID card is handed out on paper only

**Status:** accepted · **Recorded:** 2026-10-09

## Context

[ADR-0066](0066-the-digital-id-card-is-a-pdf-and-an-image-not-a-wallet-pass.md) added a digital ID
card: a card-sized PDF and an image of it, downloaded by an operator or mailed to the address stored
on the household. It shipped in 1.29.0.

The Tafel does not want the card handed out that way. The question ADR-0066 answered was *which*
digital form the card takes; the organisation's answer to the question before it - whether there is
a digital card at all - is no. That is a decision about how the Tafel works with its customers, not
a technical one, and the application follows it.

## Decision

**The ID card exists as the printed card only. Nothing in the application hands it out as a file or
by mail.**

- The download and mail endpoints under `/api/households/{householdId}/id-card`, the service behind
  them, the card-sized stylesheet, the mail template and the "Ausweis digital …" dialog are removed,
  along with `tafeladmin.features.idCardMailEnabled` and `/api/config`'s `idCardMailEnabled`.
- `HouseholdPdfService` generates the printable card (`idcard-document.xsl`) as before; check-in
  scans its QR code.
- The audit trail keeps rendering the entries the mail action wrote while it existed
  (`idCardSentByMail` in `audit-api.service.ts`, the `READ`-with-detail branch in
  `audit-entry-list.component.html`). `audit_log` is append-only, and a recorded mail to a customer
  must stay readable until retention removes it.

## Consequences

- No mail leaves the application for an address outside the organisation, and no copy of a card
  sits in `mail_outbox` or in a BCC archive.
- A customer who loses the card needs a reprint; there is nothing on the phone to fall back on.
- PDFBox is a test dependency only, and `PDFService` renders PDFs and nothing else.
- Cards already downloaded or mailed stay valid at check-in: their QR code holds the household
  number, exactly like the printed card's. Like a paper card, they cannot be recalled.
- A mail already queued when the removal is deployed is still delivered - the outbox stores the
  finished message and needs no template to send it.
- The audit rendering for `idCardSentByMail` has no writer left. It can go once the audit retention
  has removed the last such entry.

## Alternatives considered

**Keep the download, remove only the mail.** `idCardMailEnabled: false` already does exactly that
per deployment. Rejected: the organisation's decision is against the digital card as such, not
against one way of delivering it.

**Leave the feature in the code, switched off by configuration.** Rejected: there is no switch for
the download, and code kept for a use nobody intends still has to be maintained, tested and
explained in the GDPR documentation.

## References

- [ADR-0066](0066-the-digital-id-card-is-a-pdf-and-an-image-not-a-wallet-pass.md) - the superseded decision
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/household/internal/masterdata/HouseholdPdfService.kt`
- `frontend/src/main/webapp/src/app/common/components/audit-entry-list/audit-entry-list.component.html`
