# ADR-0066: Wallet passes are .pkpass files signed in-process, offered only where a certificate is configured

**Status:** accepted · **Recorded:** 2026-10-08

## Context

The ID card ("Bezugskarte") is a sheet of paper an operator prints, cuts and folds. Customers lose
it, and most of them carry a phone. The card's only function at check-in is its QR code, which
holds the household number, so a card on a screen is as good as one on paper - the scanner reads
both.

Two of the digital forms are plain files anybody can open: a card-sized PDF and the same card as an
image. The third, a card in the phone's wallet app, is the one customers actually keep at hand, and
it is the one with a constraint: a wallet app only accepts a card from an issuer it can verify.

- **Apple Wallet** takes a `.pkpass` file: a ZIP of `pass.json`, images, a manifest of their hashes
  and a PKCS #7 signature over that manifest, made with a *Pass Type ID certificate* that Apple
  issues to members of its paid developer program and that expires after a year.
- **Google Wallet**'s own issuing path is a REST API: the issuer registers with Google, creates a
  pass *class* and *object* on Google's servers through a service account, and hands the customer a
  signed "Save to Google Wallet" link. Google Wallet on Android also imports a `.pkpass` file.

This is a volunteer-run deployment with one operator. Whether it holds an Apple developer
membership is an organisational question outside this repository, and it may differ between
deployments and change over time.

## Decision

**The wallet form of the ID card is a `.pkpass` file, built and signed inside the application, and
the format exists only where the deployment has configured a certificate to sign it with.**

- `WalletPassService` (`modules/household/internal/idcard/`) builds the pass and signs the manifest
  with BouncyCastle's CMS classes (`bcpkix`) - the JDK has no public API for a detached PKCS #7
  signature. The certificate (`.p12`) and Apple's intermediate certificate are read from disk for
  every pass.
- `tafeladmin.wallet` holds the wiring (pass type identifier, team identifier, the two file paths,
  the password) and is absent by default. `tafeladmin.features.walletPassEnabled` is the kill
  switch. `TafelAdminProperties.walletPassAvailable` combines them and is the one rule
  `HouseholdIdCardService` enforces and `/api/config` reports as `walletPassEnabled` - the shape
  [ADR-0018](0018-optional-features-behind-a-kill-switch.md) set for the scanner folder.
- The same one file serves both platforms. The pass is a `generic` pass whose QR code carries
  exactly what the printed card's does, so nothing at check-in knows which form it scanned.
- The pass is static: no `webServiceURL`, no push updates, no expiry date. Like the printed card it
  states who the household is, not whether it is currently eligible - that is answered at check-in.
- The PDF and the image need none of this and are always available. Both are one XSL-FO stylesheet
  (`idcard-digital-document.xsl`) through FOP's PDF and bitmap renderers (`PDFService.generatePng`).

## Consequences

- A deployment without an Apple developer membership loses the wallet card and nothing else: the
  format is not offered, and the PDF and image cover the same use.
- No personal data goes to a third party to issue a card. The pass is a file the application hands
  to the operator or mails to the customer; neither Apple nor Google is called.
- **The certificate expires every year.** A pass signed after that would be refused by the phone
  without a reason, so `WalletPassService` checks the validity and fails with a logged cause
  instead. Renewing it is an operator task; because the files are read per pass, swapping them in
  needs no restart.
- A pass cannot be recalled or updated. A household that is locked or deleted keeps a card in its
  wallet exactly as it would keep the paper one - which is why the card must stay meaningless on its
  own, and why adding an expiry date or eligibility to it would be a new decision.
- Android support rests on Google Wallet importing a foreign format, which Google could change. The
  image is the fallback that does not depend on it.
- The signature cannot be verified end to end in a test: `WalletPassServiceTest` checks structure,
  hashes and the signature against a throwaway certificate chain, but only a real certificate on a
  real phone proves that a pass is accepted.
- One more runtime dependency (`bcpkix`, and `bcutil` with it), next to the `bcprov` already there.

## Alternatives considered

**Google Wallet API in addition to, or instead of, `.pkpass`.** Rejected: it needs an issuer account
and a service-account key, creates one object per household on Google's servers - the household
number and main person's name, for every customer who asks for a card - and requires outbound calls
this application otherwise makes none of. It would also still leave iPhones needing `.pkpass`.

**A third-party pass service** (PassKit, PassSlot and the like). Rejected for the same data-transfer
reason, plus a per-pass or subscription cost and a processor agreement for a feature that is a
convenience.

**No wallet format, PDF and image only.** This is what a deployment without a certificate gets, and
it was the fallback from the start. Rejected as the *only* option because a wallet card is what is
at hand at the door: it needs no gallery search and shows up on the lock screen.

**An unsigned or self-signed pass.** Not an option: iOS refuses it outright.

**Rasterizing the PDF for the image** (PDFBox) or drawing it with Java2D. Rejected: a second
rendering path means a second layout to keep in step. FOP already renders the stylesheet to a PNG
with the same embedded font.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/household/internal/idcard/` -
  `WalletPassService`, `HouseholdIdCardService`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/config/properties/TafelAdminProperties.kt` -
  `TafelAdminWalletProperties`, `walletPassAvailable`
- `backend/src/main/resources/application.yml` - `tafeladmin.wallet`, with the setup steps
- `backend/src/main/resources/pdf-templates/customer-pdf/idcard-digital-document.xsl`
- [ADR-0018](0018-optional-features-behind-a-kill-switch.md),
  [ADR-0009](0009-server-side-document-generation-with-xsl-fo.md)
- Household module README, "Digital ID card"
