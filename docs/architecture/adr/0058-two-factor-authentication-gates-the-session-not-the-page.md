# ADR-0058: Two-factor authentication (authenticator app or e-mail code) gates the session, not the page

**Status:** accepted · **Recorded:** 2026-09-24

## Context

A login was a password and nothing else: whoever learned one - by looking over a shoulder, from a reused
password, from a phishing page - could act as that user, including as an administrator, on a system that holds
the personal data of people in need. A second factor was wanted "via e-mail or OTP", optional per user and
possibly required for everyone. Three things decided what that means here:

- **Permissions are already computed per request** from a JWT that carries identity only
  (`TafelJwtAuthProvider`, [ADR-0006](0006-stateless-jwt-cookie-authentication.md)), and a login that owes a
  password change already gets a short-lived token that grants nothing. A second factor fits that shape without
  touching a single controller - if the *session* is what is gated, not the login page.
- **A screen-level check is not a gate.** Plenty of endpoints ask only `isAuthenticated()` (a user's own data
  export, changing the password); a session that has only passed the password step must not reach those
  either, and a new such endpoint must not become a way around the second factor by being forgotten.
- **A million-value code invites a search.** A six-digit code is only a factor if wrong guesses are
  counted, and a login by password - which resets the login counter - must not also reset that count.

## Decision

There are **two methods, usable side by side; a code of either completes a login**:

- a **time-based one-time password (TOTP, RFC 6238)** from an authenticator app -
  `common/auth/components/TotpService.kt`, HMAC-SHA1, 30 second steps, 6 digits, the defaults every such app
  supports (`users.mfa_totp_enabled`). The code itself is calculated by the
  [GoogleAuth](https://github.com/wstrange/GoogleAuth) library (`com.warrenstrange:googleauth`, the Apache
  HttpClient it declares excluded - only its QR generator uses it); the 160 bit secret (the library makes 80),
  the accepted step window and the single-use rule stay in `TotpService`/`MfaService`;
- a **6-digit code sent by e-mail** to the address on the account (`users.email`, optional, set under Benutzer;
  `MfaEmailCodeService`, `users.mfa_email_enabled`), available only where a mail can be sent at all and to a
  user who has an address.

Both are opt-in per user, set up on the "Mein Konto" page - each one only counts once a code for it was
accepted - and switched off again with a code of either method (`MfaController`, `MfaService`). **The operator
can require one for everyone** (`tafeladmin.mfa.required`, read per use so it hot-reloads like the rest of the
configuration): "required" means *at least one method*, and the last one cannot be switched off while it is.

- **The session is gated.** After the password step a user with it switched on gets the short-lived token,
  *without* the `mfa` claim (`JwtTokenService`); `TafelJwtAuthProvider` grants such a token no permissions
  while the DB says the user has it enabled, so switching it on takes effect on sessions that were already
  open. `POST /api/mfa/verify` exchanges it for a full session carrying the claim.
- **Deny by default.** `MfaPendingFilter` refuses every request of a session that still owes its code except
  `POST /api/mfa/verify`, `POST /api/mfa/email/send` (a code is only sent on request, or automatically by the
  login page for a user whose only method it is), `GET /api/users/info` (how the frontend learns a code is
  owed) and `POST /api/users/logout`. Setting up, changing and disabling a method additionally refuse such a
  session in `MfaController`, so knowing a password never lets someone replace or remove the second factor.
- **A required second factor gates the session the same way.** When it is required and the user has no
  method, `TafelJwtAuthProvider` grants no permissions and the filter lets through only what sets a method up
  (a second, narrower allow-list) - computed per request, like the pending state, so switching the setting on
  reaches sessions that are already open. The frontend guard sends every route but the account page's
  `zwei-faktor` tab there.
- **E-mail codes are single-use, short-lived and rate-limited.** One live code per user (`mfa_email_codes`),
  deleted when accepted, expiring after `tafeladmin.mfa.emailCodeValidity`, and a new one only after
  `emailCodeCooldown` - otherwise the send endpoint would fill somebody's mailbox (it is also rate-limited per
  IP). Only a hash is stored.
- **Wrong codes are counted** in `login_attempts` under the key `mfa:<username>`, so the existing lockout
  rule (`security.loginAttempts`), the admin screen and the cleanup apply, and a password login does not reset
  it. Verification is also rate-limited per IP (`scope = "mfa"`).
- **A code is good once.** The time step of the last accepted code is stored
  (`UserRepository.advanceMfaStep`, a conditional bulk update, so two racing requests cannot both win) and a
  code for that step or an earlier one is refused. Steps one either side of the current one are accepted, for
  a phone clock that is a little off.
- **Recovery is an administrator.** Someone who lost the phone is reset by `USER_MANAGEMENT`
  (`DELETE /api/users/{id}/mfa`), and only an administrator may reset an administrator's - the same rule as
  for an administrator's password. There are no recovery codes.
- The secret is redacted in the audit trail (`AuditScope`), left out of every response and export, and drawn
  as a QR code in the browser, so it goes nowhere but the setup page.

## Consequences

- **The secret is stored as it is** (`users.mfa_secret`), not encrypted: the server has to read it to check a
  code, and a key it would decrypt with would live next to the database anyway. Anyone who can read the users
  table can therefore compute valid codes; the password hashes stay hashed. Encrypting it with a key from
  outside the database would help against a leaked backup and is not done here.
- **No recovery codes.** A user who loses the phone waits for an administrator, and an administrator who
  loses theirs needs another. The alternative would be one more table, one more screen and one more thing to
  keep safe, for an installation with a handful of administrators.
- **Enforced per deployment, not per role, and by the operator.** The switch is all-or-nothing and takes
  effect at once (within the config reload interval), so an operator who turns it on for administrators who
  have no method yet locks them out of everything but the setup page - which is where they can fix it. It is a
  config property and not a setting in the UI on purpose: it is a deployment decision, and an administrator
  cannot lock everyone out from a screen.
- **The e-mail address is optional, so the e-mail method is not offered to everyone.** A user without an
  address sees why on the setup page and can use the app instead; an account created before the column
  existed has none until someone enters it.
- **The e-mail code is only as strong as the mailbox.** That is why a user can have both methods, and why the
  requirement asks for *a* method rather than for the app.
- **The stored hash of a code does not protect it.** A 6-digit code can be brute-forced from its SHA-256 in
  an instant; the hash only keeps a casual reader of the table from seeing a live code. What stops guessing is
  the per-user count of wrong codes, the expiry and the single use.
- **`tafeladmin.mfa.emailCodeForTests` fixes the code that is sent.** It exists so the end-to-end suite, which
  has no mail server, can complete an e-mail login. It must never be set in a real deployment: with it, anyone
  who knows a username and password knows the second factor.
- **An account that must change its password and has it switched on has to give the code first**, because
  the session does nothing until then - and, after the password change, the fresh login asks for a code
  again, from the next 30 second step since a code is single-use.
- **A code entry that is locked out is visible to administrators** as an entry named `mfa:<username>` on the
  login-attempts screen, which is also where it is cleared.

## Alternatives considered

- **`java-otp` or `java-totp` instead of GoogleAuth.** GoogleAuth is the most used of them; the others are no
  more active (last releases 2022 and 2020). Its own last release is also from 2020, so a fix would have to
  come from a new one or from replacing it, which `TotpService` being the only caller keeps to one class.

- **E-mail as the only method.** It makes the mailbox the second factor, needs a working mail server on
  every login and a place to hold outstanding codes, where TOTP holds nothing per attempt. It is offered
  anyway, next to the app, for the users who have no phone to put an app on.
- **TOTP as the only method.** An installation without an authenticator app on hand would have had no second
  factor at all.
- **Checking the code only on the login page.** Simpler, and a session that only knows the password would
  still be able to call anything asking only `isAuthenticated()`.
- **A separate counter for wrong codes.** Two more columns and a lockout rule of their own, where
  `login_attempts` already has the counter, the lockout, the admin view and the cleanup.
- **The requirement as a database setting behind a settings screen.** It would take effect on every instance
  at once without a file edit, at the price of one administrator being able to lock everybody out of the
  application from a browser tab.
- **Calculating the codes by hand.** Roughly 40 lines of HMAC and truncation, and it worked, but code that
  every authenticator app has to agree with byte for byte is better left to the most widely used library.

## References

- `TotpService`, `MfaService`, `MfaEmailCodeService`, `MfaController`, `MfaPendingFilter`,
  `TafelJwtAuthProvider`, `R__00124_user_mfa.sql`
- `MfaIT` (real database, real security filter chain), `TotpServiceTest` (RFC 6238 test vectors)
- The user module README's "Mein Konto" section for the frontend side
