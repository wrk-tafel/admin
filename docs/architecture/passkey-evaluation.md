# Passkeys — evaluation

Analysis for [issue #3820](https://github.com/wrk-tafel/admin/issues/3820), which asks whether
passkeys (WebAuthn credentials) make sense as a way to log in here. This is an evaluation, not a
decision record. The one decision that came out of it is
[ADR-0070](adr/0070-passkeys-are-a-second-factor-of-their-own.md): a
passkey as a third, optional second factor, for the people who do log in on a device of their own.
A passkey instead of the password is undecided, and this document is the case against doing it now.

**Assessment up front: passkeys are no replacement for the existing methods here.** A passkey lives
on a person's own device, and most logins happen on shared PCs and tablets at the distribution
([§3](#3-the-question-that-decides-the-value-which-devices-do-people-log-in-on)). There a passkey
costs more steps than the authenticator app it would replace. That is why what was built is opt-in
and stands next to the two code methods rather than in place of them;
[§6](#6-what-would-change-this-assessment) lists what would make more of it worth doing.

## 1. Where a passkey would plug in

The login is two steps, both stateless
([ADR-0006](adr/0006-stateless-jwt-cookie-authentication.md),
[ADR-0058](adr/0058-two-factor-authentication-gates-the-session-not-the-page.md)):

1. `POST /api/login` with HTTP Basic (`TafelLoginFilter`) issues a JWT cookie. For a user with a
   second factor it is a short-lived token without the `mfa` claim, which `MfaPendingFilter` lets do
   almost nothing.
2. `POST /api/mfa/verify` with a TOTP or e-mail code exchanges it for the full session.

A passkey can enter at either step, and those are two different features:

| | A: passkey as a third second factor | B: passkey instead of password and code |
|---|---|---|
| Flow | password, then the passkey instead of a 6-digit code | "Sign in with passkey" on the login page, nothing typed |
| What it buys | a second factor that cannot be phished or read over a shoulder, and no code to type | the same, plus no password to remember or reuse |
| Fits the existing model | directly: one more method next to `mfa_totp_enabled` / `mfa_email_enabled`, verified in the pending-session step | needs a new unauthenticated entry point and a decision that a passkey with user verification counts as both factors |
| Size | medium | A plus the login page flow, discoverable credentials and the policy questions in [§5](#5-recovery-and-fallback) |

B can be added on top of A: the credential storage, the registration and the "Mein Konto" tab are
the same. ADR-0070 is A.

## 2. What is specific to this application

- **No server-side session, and two instances during a deploy.** A WebAuthn ceremony needs the
  server to remember the challenge between "give me options" and "here is the response". With no
  `HttpSession` ([ADR-0006](adr/0006-stateless-jwt-cookie-authentication.md)) and two versions
  answering requests for half a minute per deploy
  ([ADR-0069](adr/0069-prod-is-deployed-without-downtime-and-without-a-deploy-window.md)), that has
  to live in the database — a row per pending ceremony, like `mfa_email_codes` — or in a signed
  short-lived cookie, not in memory.
- **prod, test and dev share one domain.** All three live under
  `https://tafel.wrk.at/verwaltung[-test|-dev]/`. A passkey is bound to the domain (the RP ID), not
  to the path, so the three environments are one relying party to the browser. Each environment
  only accepts credentials stored in its own database, so there is no crossover in access, but a
  user who registers on test and prod sees two entries for `tafel.wrk.at` in the passkey picker. The
  entry's display name would have to carry the environment label.
- **Rules that exist for second factors apply unchanged.** Adding or removing a method needs a code
  of an existing one
  ([ADR-0059](adr/0059-second-factor-changes-need-an-existing-second-factor.md)), wrong attempts
  count towards the lockout in `login_attempts`, an administrator can reset a user's methods, a
  change triggers the account security notification, and the credential table belongs in
  `AuditScope` and in the GDPR export and deletion of a user.
- **Mandatory MFA** (`tafeladmin.mfa.required`,
  [ADR-0061](adr/0061-mandatory-two-factor-setup-happens-in-the-login-flow.md),
  [ADR-0062](adr/0062-mandatory-mfa-also-requires-an-email-address.md)): a passkey would have to
  count as "a method", and the setup page in the login flow would have to offer it. ADR-0062's
  e-mail requirement stays useful as the recovery path.
- **Tests.** Chrome's virtual authenticator (DevTools protocol) lets Cypress register and use a
  passkey without hardware, so the e2e rule for new user-facing flows can be met.

## 3. The question that decides the value: which devices do people log in on?

A passkey lives on a person's device (phone, laptop, security key) or in their synced password
manager.

- **Own phone or own laptop**: works well, and is the case passkeys are made for.
- **Shared desk PC or tablet at the distribution**: the passkey is not on that machine. The user
  either scans a QR code with their phone (needs Bluetooth on the PC and internet on both) or uses a
  hardware key. A platform passkey stored on a shared Windows account would belong to everyone who
  knows that PC's PIN, which defeats the purpose.
- **Ticket monitor and scanner devices**: unaffected, they keep a session open.

**Most logins here are the second case** — shared PCs and tablets. On those, the passkey flow is
"type the password, pick up the phone, scan a QR code, confirm", against "type the password, pick up
the phone, read six digits" for the authenticator app. That is no gain in convenience, it adds a
Bluetooth requirement the shared machines may not meet, and the phishing resistance it does add
protects an application whose users reach it from a handful of known machines.

## 4. Framework support in the version in use

Checked against Spring Security 7.1.1, which Spring Boot 4.1.1 manages:

- WebAuthn support is a module of its own, `spring-security-webauthn`. It is not on the classpath —
  `spring-security-web` carries only the browser-side script — so it is a new dependency, and it
  brings `webauthn4j-core` with it (`gradle/verification-metadata.xml` needs both).
- Its filters (`PublicKeyCredentialRequestOptionsFilter`, `WebAuthnAuthenticationFilter`,
  `PublicKeyCredentialCreationOptionsFilter`, `WebAuthnRegistrationFilter`) keep the pending
  challenge behind two interfaces, `PublicKeyCredentialRequestOptionsRepository` and
  `PublicKeyCredentialCreationOptionsRepository`. The only implementations shipped are the
  `HttpSession...` ones, so the first point of [§2](#2-what-is-specific-to-this-application) means
  writing both.
- Credentials have JDBC storage (`JdbcUserCredentialRepository`,
  `JdbcPublicKeyCredentialUserEntityRepository`). The module ships no schema file; the tables would
  be Flyway migrations written here.
- The ceremony logic itself sits behind `WebAuthnRelyingPartyOperations`
  (`Webauthn4JRelyingPartyOperations`), which is independent of the filters.

That leaves three ways to build it rather than two:

| | Fits feature A | Cost |
|---|---|---|
| Spring's filters with custom options repositories | poorly: the authentication filter ends in a session-style login, where A needs "exchange the pending JWT for a full one" as `POST /api/mfa/verify` does | a success handler that re-implements that exchange, plus filter ordering against `MfaPendingFilter` |
| `WebAuthnRelyingPartyOperations` behind endpoints in `MfaController` | well: registration and verification become two more methods next to TOTP and e-mail, and the lockout, ADR-0059 check and notification stay where they are | the options/response JSON handling the filters would have done |
| `webauthn4j` directly | well | the same, plus the credential storage and the verification wiring Spring already provides |

ADR-0070 took the third: with the ceremony behind the application's own endpoints, what Spring's
module still adds is its credential repositories, and those would have been a second, unaudited
persistence path next to the JPA entities everything else here uses.

## 5. Recovery and fallback

A lost device must not lock a user out for good. An account that keeps a code method next to its
passkey has that as its fallback, at the cost of being only as phishing-resistant as its weakest
allowed login. An account with passkeys only has no fallback of its own: an administrator resets its
second factor, as for a lost phone with the authenticator app.

## 6. What would change this assessment

- Logins moving to people's own devices — e.g. volunteers using the application on their own phones
  rather than on the machines at the distribution.
- A concrete phishing concern, or a requirement for a phishing-resistant factor for accounts with
  `ADMINISTRATOR` or `USER_MANAGEMENT`. Hardware keys for those few accounts work on shared machines
  without Bluetooth, and that would be feature A with a much smaller audience.

If either happens, the next step is **B**. What that has to settle first:

- Whether user verification on the device may stand in for the password.
- Whether the mandatory setup in the login flow
  ([ADR-0061](adr/0061-mandatory-two-factor-setup-happens-in-the-login-flow.md)) should offer a
  passkey, which today is added on "Mein Konto" afterwards.
