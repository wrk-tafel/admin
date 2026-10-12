# ADR-0070: Passkeys complete a login next to a code method, never instead of one

**Status:** accepted · **Recorded:** 2026-10-13

## Context

[ADR-0058](0058-two-factor-authentication-gates-the-session-not-the-page.md) gives a user two methods for the
second step of a login, a code from an authenticator app and a code by e-mail. Both mean picking up a phone
and typing six digits at every login. A passkey (WebAuthn credential) does the same job with a fingerprint or a
touch, and cannot be phished or read over a shoulder.

The [passkey evaluation](../passkey-evaluation.md) found that most logins here happen on shared PCs and
tablets, where a passkey is no gain, and that a passkey as the *only* way in raises questions with no good
answer on this deployment: what a lost device means, and whether a credential on a shared machine counts as a
second factor at all. It also found that for someone who logs in on a device of their own, a passkey is a real
convenience. So the feature is worth having for those users, as long as it costs everybody else nothing and
changes none of the rules the existing methods rest on.

Three things about this application shaped how it is built:

- There is no server-side session ([ADR-0006](0006-stateless-jwt-cookie-authentication.md)), and a deploy runs
  two instances against one database for a moment
  ([ADR-0069](0069-prod-is-deployed-without-downtime-and-without-a-deploy-window.md)). A WebAuthn ceremony is two
  requests with a challenge to remember in between.
- [ADR-0059](0059-second-factor-changes-need-an-existing-second-factor.md) requires "a code of a method the
  user has" for every change to the second factor and to the account's e-mail address. That sentence assumes
  every user with a second factor can produce a code.
- Dev, test and prod share one domain, and a passkey is bound to the domain, not the path.

## Decision

**A passkey is an addition to a code method. It completes the second step of a login in place of a code, and it
exists only while the app or the e-mail code is on.**

- **Only a user who has a code method can add a passkey**, and adding one takes a code of it
  (`MfaService.enablePasskey`). Removing one takes a code too. The last code method cannot be switched off
  while a passkey is left (`MfaService.disable`). `UserEntity.hasMfa` - "does a login need a second step" - is
  therefore still decided by the two code methods alone, and so are mandatory MFA
  ([ADR-0061](0061-mandatory-two-factor-setup-happens-in-the-login-flow.md),
  [ADR-0062](0062-mandatory-mfa-also-requires-an-email-address.md)) and the setup page in the login flow.
- **At login the passkey is offered first and the code form stays.** `POST /api/mfa/passkey/login-options` and
  `/passkey/verify` are two more calls `MfaPendingFilter` allows a session that owes its second step; a verified
  assertion ends in the same exchange of the pending token for a full one as `POST /api/mfa/verify`. A refused
  assertion counts towards the same lockout as a wrong code (`mfa:<username>` in `login_attempts`).
- **The challenge is a row in `passkey_challenges`**, one per user and purpose, deleted by the request that
  answers it and expired after `tafeladmin.mfa.passkey.challengeValidity`. The credentials are rows in
  `user_passkeys`, audited through `AuditScope` with the key material redacted; the signature counter and the
  last-used time are written by a bulk update, so a login leaves no audit entry.
- **The relying party is configuration**: `tafeladmin.mfa.passkey.rpId` and `origins`, read per use. Unset,
  passkeys are not offered. The user handle is derived from the environment label and the user id, and the
  label is part of the name the authenticator shows, so registering on test neither replaces nor is mistaken
  for the passkey for prod.
- **Verification is `webauthn4j` behind `PasskeyService`**, with no attestation requested. Spring Security's
  WebAuthn module is not used: its filters keep the challenge in the `HttpSession` and end in a login of their
  own, where this needs the pending-session exchange `MfaController` already has. `webauthn4j` is the library
  that module is built on, pinned to the version Spring Security 7.1 uses.
- **The browser converts the options and the credential to and from JSON itself**
  (`PublicKeyCredential.parseCreationOptionsFromJSON()`, `parseRequestOptionsFromJSON()`, `toJSON()`). A browser
  without those is treated as one without passkeys (`PasskeyService.isSupported` in the frontend).
- An administrator's reset (`DELETE /api/users/{id}/mfa`) removes the passkeys together with the methods.

## Consequences

- A lost or absent device never locks anyone out, and needs no administrator: the code method the passkey was
  added next to still works. ADR-0059's rule stays true as written, and no screen had to learn a second way of
  proving "it is really you".
- An account with a passkey is exactly as phishing-resistant as it was before: whoever can obtain a code can
  still log in with it. The passkey buys convenience, and resistance only for the logins that use it. Closing
  that - an account that accepts nothing but its passkeys - is a separate decision, and it needs the recovery
  story this one avoids.
- Nothing changes for a user who does not add one, and nothing changes on a deployment that sets no `rpId`.
- Changing `rpId` leaves every registered passkey unusable. The users fall back to their code method and
  register again; nothing detects or cleans up the stale rows.
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

- **A passkey as a method of its own, usable alone.** It would make "a code of a method the user has"
  unanswerable for a passkey-only user, so every place that asks for one - adding and removing methods, the
  account's e-mail address, the mandatory setup in the login flow - would need a passkey variant, and a lost
  device would be an administrator's job. That is the larger feature the evaluation weighs; the people who asked
  for passkeys here wanted not to type a code, not to give up the code.
- **A passkey instead of password and code** ("sign in with passkey" on the login page). Needs an
  unauthenticated entry point and a ruling that user verification on the device replaces the password. It can
  be added on top of this: storage, registration and the account page are the same.
- **Spring Security's WebAuthn filters with custom challenge repositories.** Both repositories would have to be
  written anyway (only `HttpSession` implementations ship), and the authentication filter's own notion of a
  successful login would have to be bent back into the pending-token exchange.
- **The challenge in a signed, short-lived cookie.** No table, but a challenge has to be usable once, and a
  cookie cannot be taken back after it was answered without a server-side record of that.
- **Deriving the relying party from the request's `Host`.** No configuration, but the value the verification
  rests on would come from a header, and behind the reverse proxy from how that proxy is set up.

## References

- [Issue #3820](https://github.com/wrk-tafel/admin/issues/3820), [`passkey-evaluation.md`](../passkey-evaluation.md)
- `backend/.../common/auth/components/PasskeyService.kt`, `MfaService.kt`, `MfaPendingFilter.kt`,
  `common/auth/MfaController.kt`
- `backend/src/main/resources/db-migration/R__00132_user_passkeys.sql`
- `backend/src/test/.../common/auth/PasskeyIT.kt`, `TestPasskeyAuthenticator.kt`
- `frontend/.../common/security/passkey.service.ts`, `common/views/login-mfa/`, `modules/user/components/user-mfa/`
