# ADR-0066: The digital ID card is a PDF and an image, not a wallet pass

**Status:** accepted · **Recorded:** 2026-10-08

## Context

The ID card ("Bezugskarte") is a sheet of paper an operator prints, cuts and folds. Customers lose
it, and most of them carry a phone. The card's only function at check-in is its QR code, which
holds the household number, so a card on a screen is as good as one on paper - the scanner reads
both.

The obvious home for such a card on a phone is the wallet app. Each wallet platform decides whose
cards it accepts, and both ask for an account and a signing key:

- **Apple Wallet** takes a `.pkpass` file whose manifest is signed with a *Pass Type ID
  certificate*. Only Apple issues one, only to members of its paid developer program, for one year
  at a time. A self-signed certificate or the organisation's own domain certificate is refused,
  because the chain does not end at Apple.
- **Google Wallet** issues through a "Save to Google Wallet" link: a JWT signed with the key of a
  Google Cloud service account that belongs to a Google Wallet issuer registered with, and approved
  by, Google. Saving the pass hands its content - household number, main person's name - to Google.
- An **unsigned `.pkpass`** needs neither, and dedicated pass apps on Android open it. Whether
  Google Wallet's own importer accepts one is not documented by Google, an iPhone refuses it, and a
  customer may have to install a separate app first.

This is a volunteer-run project. It does not want a paid Apple membership, and it does not want to
set up and maintain a Google Cloud project for a convenience.

## Decision

**The ID card is handed out digitally as a card-sized PDF and as an image of that PDF. There is no
wallet card.**

- `HouseholdIdCardService` (`modules/household/internal/idcard/`) offers `PDF` and `IMAGE`, as a
  download or as attachments of a mail to the address stored on the household.
- Both are one XSL-FO stylesheet, `idcard-digital-document.xsl`. `PDFService.generatePdf` renders
  it; `PDFService.generatePng` rasterizes that finished PDF with PDFBox.
- The card carries household number, QR code, main person's name and the person counts - less than
  the printed card. Its QR code holds exactly what the printed card's does, so nothing at check-in
  knows which form it scanned.

## Consequences

- No account with Apple or Google, no certificate to renew, no key material in the deployment, no
  cost, and no personal data sent to a third party to issue a card.
- Both formats open on every phone without an extra app, which a card for one platform's wallet
  would not.
- The card is not where a wallet card would be: the customer has to find a picture in the gallery
  or a file in the downloads, and nothing surfaces it on the lock screen.
- Like the paper card, a digital one cannot be recalled or updated once handed out, and it states
  who the household is, not whether it is currently eligible - that is answered at check-in.
- The image costs a runtime dependency: PDFBox, used until now only by tests.

## Alternatives considered

**A signed `.pkpass` with an Apple Pass Type ID certificate.** The only way into an iPhone's wallet.
Rejected: it requires a paid Apple developer membership.

**"Save to Google Wallet" through the Google Wallet API.** The native route on Android. Rejected:
it requires a Google Cloud project, an issuer account that Google has to approve and a service
account key provisioned to every deployment, and it discloses customer data to Google.

**An unsigned `.pkpass` as an Android-only format.** Built and then removed. It needs no account,
but it could not be shown to work in Google Wallet itself, it excludes iPhones, and it would have
put a format in front of operators that works for some customers' phones and silently not for
others. The image does the same job on all of them.

**A third-party pass service** (PassKit, PassSlot and the like). Rejected: a per-pass or subscription
cost, a processor agreement and customer data at a third party.

**FOP's bitmap renderer for the image.** Tried and dropped: it asks the JVM for the fonts installed
on the host before drawing, which throws in a container without fontconfig - the production image.
The PDF has its font embedded, so rasterizing the PDF depends on nothing outside the application.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/household/internal/idcard/HouseholdIdCardService.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/pdf/PDFService.kt` - `generatePng`
- `backend/src/main/resources/pdf-templates/customer-pdf/idcard-digital-document.xsl`
- [ADR-0009](0009-server-side-document-generation-with-xsl-fo.md)
- Household module README, "Digital ID card"
