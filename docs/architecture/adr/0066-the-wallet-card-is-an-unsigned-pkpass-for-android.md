# ADR-0066: The wallet card is an unsigned .pkpass for Android, with no Apple certificate

**Status:** accepted · **Recorded:** 2026-10-08

## Context

The ID card ("Bezugskarte") is a sheet of paper an operator prints, cuts and folds. Customers lose
it, and most of them carry a phone. The card's only function at check-in is its QR code, which
holds the household number, so a card on a screen is as good as one on paper - the scanner reads
both.

Two of the digital forms are plain files anybody can open: a card-sized PDF and the same card as an
image. The third, a card in the phone's wallet app, is the one that is at hand at the door, and it
is the one with a constraint: each wallet platform decides whose cards it accepts.

- **Apple Wallet** takes a `.pkpass` file: a ZIP of `pass.json`, images, a manifest of their hashes
  and a PKCS #7 signature over that manifest. The signature has to be made with a *Pass Type ID
  certificate*, which only Apple issues, only to members of its paid developer program, and for one
  year at a time. Any other certificate - self-signed, or the organisation's own domain
  certificate - is refused, because the chain does not end at Apple.
- **Android** has no single gatekeeper for the file format. Wallet apps there read a `.pkpass`
  without checking who signed it. Google Wallet's *own* issuing path is something else entirely: no
  file but a "Save to Google Wallet" link, a JWT signed with the key of a Google Cloud service
  account that belongs to a registered Google Wallet issuer.

The organisation does not hold an Apple developer membership and does not intend to pay for one.

## Decision

**The wallet form of the ID card is an unsigned `.pkpass` file, offered as a format for Android.
The application holds no Apple certificate and signs nothing.**

- `WalletPassService` (`modules/household/internal/idcard/`) builds the file: `pass.json`, the logo
  in the sizes a pass expects, and the manifest. There is no `signature` entry.
- The UI, the mail and the user guide call it what it is - a wallet card for Android - and point
  iPhone users to the image and the PDF, which work everywhere.
- It needs no setup. `tafeladmin.features.walletPassEnabled` is a kill switch for a deployment that
  wants PDF and image only; `TafelAdminProperties.walletPassAvailable` is what
  `HouseholdIdCardService` enforces and `/api/config` reports as `walletPassEnabled`
  ([ADR-0018](0018-optional-features-behind-a-kill-switch.md)).
- The pass is a `generic` pass whose QR code carries exactly what the printed card's does, so
  nothing at check-in knows which form it scanned. It has no expiry date and no update channel:
  like the printed card it states who the household is, not whether it is currently eligible.
- The PDF and the image are one XSL-FO stylesheet (`idcard-digital-document.xsl`); the image is
  that PDF rasterized with PDFBox (`PDFService.generatePng`).

## Consequences

- No cost, no certificate to renew, no key material in the deployment, and no personal data sent to
  Apple or Google to issue a card.
- **iPhone users get no wallet card.** They are served by the image and the PDF. Changing that
  means an Apple developer membership and is a new decision.
- Whether a given Android wallet app accepts an unsigned file is that app's choice, not something
  this application controls. Dedicated pass apps do; whether Google Wallet's own importer does is
  undocumented by Google and has to be tried on a device. The image is the fallback that depends
  on nobody.
- An unsigned file proves nothing about who made it. That is acceptable because the card is not a
  credential: it carries a household number that check-in looks up, and a forged card with a real
  number gains nothing the number alone would not.
- A wallet card cannot be recalled or updated. A household that is locked or deleted keeps the card
  exactly as it would keep the paper one.
- The pass is assembled by hand rather than through a library. What a pass library mainly provides
  is the signing, which is the part not used here; what remains is a JSON document, five scaled
  images, a checksum list and a ZIP.

## Alternatives considered

**A signed `.pkpass` with an Apple Pass Type ID certificate.** Rejected: it is the only way onto an
iPhone's wallet, and it requires a paid Apple developer membership the organisation does not want.

**Signing with a self-signed certificate or the organisation's domain certificate.** Not an option
for Apple Wallet, which only trusts its own chain, and unnecessary for Android apps, which do not
look. It would add key handling for no effect.

**"Save to Google Wallet" through the Google Wallet API.** This is the native route into Google
Wallet and would give Android users a first-class card. It is not rejected but not part of this
decision: it needs a Google Wallet issuer account approved by Google and a service-account key
provisioned to the deployment, and saving a pass hands the household number and the main person's
name to Google. It is tracked separately and would sit next to the file, not replace it.

**A third-party pass service** (PassKit, PassSlot and the like). Rejected: a per-pass or subscription
cost, a processor agreement and customer data at a third party, for a convenience.

**FOP's bitmap renderer for the image.** Tried and dropped: it asks the JVM for the fonts installed
on the host before drawing, which throws in a container without fontconfig - the production image.
The PDF has its font embedded, so rasterizing the PDF depends on nothing outside the application.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/household/internal/idcard/` -
  `WalletPassService`, `HouseholdIdCardService`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/pdf/PDFService.kt` - `generatePng`
- `backend/src/main/resources/pdf-templates/customer-pdf/idcard-digital-document.xsl`
- [ADR-0018](0018-optional-features-behind-a-kill-switch.md),
  [ADR-0009](0009-server-side-document-generation-with-xsl-fo.md)
- Household module README, "Digital ID card"
