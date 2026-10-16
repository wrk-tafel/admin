# ADR-0073: Passkeys are a second factor of their own

**Status:** accepted · **Recorded:** 2026-10-13

## Context

[ADR-0058](0058-two-factor-authentication-gates-the-session-not-the-page.md) gives a user two methods for the
second step of a login, a code from an authenticator app and a code by e-mail. Both mean picking up a phone
and typing six digits at every login. A passkey (WebAuthn credential) does the same job with a fingerprint or a
touch, and cannot be phished or read over a shoulder.

The [passkey evaluation](../passkey-evaluation.md) found that most logins here happen on shared PCs and
tablets, where a passkey is no gain, and that for someone who logs in on a device of their own it is a real
convenience. So the feature is worth having for those users, as long as it costs everybody else nothing.

Three things about this application shaped how it is built:

- There is no server-side session ([ADR-0006](0006-stateless-jwt-cookie-authentication.md)), and a deploy runs
  two instances against one database for a moment
  ([ADR-0069](0069-prod-is-deployed-without-downtime-and-without-a-deploy-window.md)). A WebAuthn ceremony is two
  requests with a challenge to remember in between.
- [ADR-0059](0059-second-factor-changes-need-an-existing-second-factor.md) requires "a code of a method the
  user has" for every change to the second factor. That sentence assumes every user with a second factor can
  produce a code.
- Dev, test and prod share one domain, and a passkey is bound to the domain, not the path.

## Decision

**A passkey is a third method, with the same standing as the app and the e-mail code: it can be the only one a
user has, it completes the second step of a login, and it counts wherever "does this user have a second factor"
is asked.**

- **One rule for all three methods.** `UserEntity.hasMfa` is true with any of them, and so are the pending
  session, mandatory MFA ([ADR-0061](0061-mandatory-two-factor-setup-happens-in-the-login-flow.md)) and the
  "last method cannot go while one is required" check. The first method of any kind is set up without proof and
  answered with a completed session; a user has any number of passkeys (`user_passkeys`), added and removed one
  by one.
- **ADR-0059's proof may be a passkey.** Every change to the second factor still takes proof of a method the
  user has, but the proof is a code *or* the answer of one of the user's passkeys
  (`MfaService.confirmExistingFactor`). The page asks for a code while the app or the e-mail code is on, and
  for a passkey when passkeys are all the user has. A refused passkey counts towards the same lockout as a
  wrong code (`mfa:<username>` in `login_attempts`).
- **At login the passkey is offered first**, above the code form if the account also has a code method, and
  alone if it does not. `POST /api/mfa/passkey/options` and `/passkey/verify` are two more calls
  `MfaPendingFilter` allows a session that owes its second step; a verified assertion ends in the same exchange
  of the pending token for a full one as `POST /api/mfa/verify`. The same options call serves a completed
  session that needs a passkey as proof.
- **A lost device is an administrator's reset**, exactly like a lost phone with the authenticator app:
  `DELETE /api/users/{id}/mfa` removes the passkeys together with the other methods, and the user management
  screen offers it for an account whose only method is a passkey too.
- **The challenge is a row in `passkey_challenges`**, one per user and purpose, deleted by the request that
  answers it and expired after `tafeladmin.mfa.passkey.challengeValidity`. The credentials are rows in
  `user_passkeys`, audited through `AuditScope` with the key material redacted; the signature counter and the
  last-used time are written by a bulk update, so a login leaves no audit entry.
- **The relying party is the site the request came in on** (`PasskeyRelyingParty`): the RP ID is the request's
  host name, the expected origin its scheme, host and port - what the reverse proxy passes on as `Host`,
  `X-Forwarded-Proto` and `X-Forwarded-Port`, which the session cookie's `Secure` flag already depends on. So
  passkeys are on for every deployment, with nothing to configure and no switch. The user handle is derived
  from the environment label and the user id, and the label is part of the name the authenticator shows, so
  registering on test neither replaces nor is mistaken for the passkey for prod.
- **Verification is `webauthn4j` behind `PasskeyService`**, with no attestation requested. Spring Security's
  WebAuthn module is not used: its filters keep the challenge in the `HttpSession` and end in a login of their
  own, where this needs the pending-session exchange `MfaController` already has. `webauthn4j` is the library
  that module is built on, pinned to the version Spring Security 7.1 uses.
- **The browser converts the options and the credential to and from JSON itself**
  (`PublicKeyCredential.parseCreationOptionsFromJSON()`, `parseRequestOptionsFromJSON()`, `toJSON()`). A browser
  without those is treated as one without passkeys (`PasskeyService.isSupported` in the frontend).

## Consequences

- A user whose only method is a passkey is locked out when the device is gone or the browser at hand cannot use
  a passkey, until an administrator resets the second factor. The account page says so and suggests a second
  method or a second passkey; nothing enforces one.
- An account that has a code method next to its passkey is exactly as phishing-resistant as before: whoever can
  obtain a code can still log in with it. An account with passkeys only accepts nothing else.
- The password is still the first step. "Sign in with a passkey" without a password is a separate decision.
- The mandatory setup page in the login flow offers the app and the e-mail code; a passkey is added on "Mein
  Konto" afterwards. A user who already has a passkey is past that page, since the passkey counts.
  [ADR-0062](0062-mandatory-mfa-also-requires-an-email-address.md)'s e-mail address stays required either way.
- Adding a passkey when passkeys are all the user has means two prompts in a row: one creates the new passkey,
  one proves an existing one.
- The server's own check of RP ID and origin compares the answer with what the request says about itself, so
  it is only as good as the proxy's headers. What still holds without it is the browser's half: a page can only
  use the passkeys of its own domain, so a request arriving under another host name finds no passkey that
  answers for it. A proxy that does not pass the public host on makes passkeys fail in the browser (the RP ID
  is not the page's domain) rather than weakening anything.
- Moving the installation to another host name leaves every registered passkey unusable. A user with a code
  method falls back to it and registers again; one without needs the administrator's reset. Nothing detects or
  cleans up the stale rows.
- The Angular dev server's proxy passes the browser's `Host` through (`changeOrigin: false` in
  `proxy.conf.json`), like the reverse proxy does - otherwise the backend would take itself for `localhost:8080`
  while the page is on `localhost:4200`.
- `PasskeyService` catches `RuntimeException` around both verifications. The answer is input from the browser,
  and `webauthn4j` reports an answer that is not shaped like a credential as whatever the first missing field
  throws, not as its own exception type. `PasskeyIT` covers it, since a unit test with a well-formed credential
  cannot see it.
- A new dependency whose behaviour matters for security has to be kept current: `webauthn4j-core`.
- The e2e suite depends on Chrome's virtual authenticator (DevTools protocol, `cypress/e2e/mfa.cy.ts`). The
  passkey cases cannot run in another browser.
- Up to `PasskeyService.MAX_PASSKEYS_PER_USER` passkeys per user; every login of such a user sends all their
  credential ids to the browser.

## Alternatives considered

- **A passkey only next to a code method, never alone.** A lost device would never need an administrator, and
  ADR-0059's "a code of a method the user has" would stay true as written. It cost a set of rules only passkeys
  had - a code method required before the first passkey, a code for every passkey change, the last code method
  locked while a passkey was left - and each of them needed its own explanation on the page. One rule for three
  methods is easier to build, to test and to explain, and the lockout it allows is the one the authenticator app
  already has.
- **A passkey instead of password and code** ("sign in with passkey" on the login page). Needs an
  unauthenticated entry point and a ruling that user verification on the device replaces the password. It can
  be added on top of this: storage, registration and the account page are the same.
- **Spring Security's WebAuthn filters with custom challenge repositories.** Both repositories would have to be
  written anyway (only `HttpSession` implementations ship), and the authentication filter's own notion of a
  successful login would have to be bent back into the pending-token exchange.
- **The challenge in a signed, short-lived cookie.** No table, but a challenge has to be usable once, and a
  cookie cannot be taken back after it was answered without a server-side record of that.
- **The relying party as configuration** (`rpId` and the allowed origins per deployment). The verification
  would rest on a value no request can influence, but passkeys would be off until an operator set it on every
  environment, and the screens would need a state for "not set up here".

## References

- [Issue #3820](https://github.com/wrk-tafel/admin/issues/3820), [`passkey-evaluation.md`](../passkey-evaluation.md)
- `backend/.../common/auth/components/PasskeyService.kt`, `MfaService.kt`, `MfaPendingFilter.kt`,
  `common/auth/MfaController.kt`
- `backend/src/main/resources/db-migration/R__00137_user_passkeys.sql`
- `backend/src/test/.../common/auth/PasskeyIT.kt`, `TestPasskeyAuthenticator.kt`
- `frontend/.../common/security/passkey.service.ts`, `common/views/login-mfa/`, `modules/user/components/user-mfa/`
