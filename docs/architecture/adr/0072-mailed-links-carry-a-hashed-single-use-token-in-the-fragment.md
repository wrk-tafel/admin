# ADR-0072: Mailed links carry a hashed, single-use token in the URL fragment

**Status:** accepted · **Recorded:** 2026-10-15

## Context

"Passwort vergessen?" (issue #3840) is the first feature that mails a link a person opens without a
session and that acts on their account. Until now every forgotten password went to an administrator.
A link like that is a credential for as long as it works. It sits in a mailbox, it is opened by mail
scanners and link previewers before the person sees it, and it passes through the browser and the
reverse proxy in front of the application.

The application had never built an absolute URL. `tafeladmin.server` only knew the relative base
path, and the obvious shortcut, building the link from the request's `Host` header, lets whoever
sends the request decide where the link in somebody else's mail points. That is the classic way
password-reset mails get turned into phishing.

Search terms already left URLs for a similar reason: a query string ends up in the never-rotated
`access.log` and in browser history ([ADR-0057](0057-search-endpoints-take-their-terms-in-a-post-body.md)).

## Decision

- **The token is 256 random bits, and only its SHA-256 is stored** (`SingleUseToken`,
  `password_reset_tokens.token_hash`). A copy of the table cannot be used to reset anybody's password.
  No salt or slow hash is needed: unlike a password, the token has nothing to guess.
- **Single use and short-lived.** `used_at` is set when the password is set, the row is locked while
  that happens (`PESSIMISTIC_WRITE`), and the link expires after `tafeladmin.passwordReset.tokenValidity`
  (1 hour). A new request replaces the earlier link. `MailedTokenCleanupService` deletes expired and
  used rows hourly, claiming them with `SKIP LOCKED` ([ADR-0047](0047-scheduled-jobs-coordinated-by-rows-first-shedlock-second.md)).
- **The token travels in the URL fragment** (`.../passwort-zuruecksetzen#token=...`). A browser never
  sends the fragment to a server, so the token reaches neither `access.log` nor the proxy's log. The
  page reads it client-side.
- **Nothing happens on page load.** Only the "Passwort speichern" button sends the token, so a mail
  scanner opening the link cannot use it up.
- **The link is built from `tafeladmin.server.publicUrl`**, configured per environment and never
  derived from a request. Without it, or without mail (`tafeladmin.mail`), the feature is switched off
  and `/api/config/public` tells the login page to hide the link.
- **The request endpoint says nothing.** `POST /api/password-reset/request` answers `202` whether or
  not an account matched, and a further request for the same account within
  `tafeladmin.passwordReset.requestCooldown` is not acted on. Both public endpoints are rate-limited
  per address (`RateLimitFilter`, scope `passwordReset`). They are exempt from CSRF: there is no
  session a forged request could ride on, a request only mails the account's own address, and setting
  a password needs the token from that mail.
- **Setting the password is an ordinary password change.** It goes through the same password policy,
  clears `passwordChangeRequired`, ends every session (`tokenInvalidatedAt`) and notifies the account
  by mail. It does not skip the second factor, and it does not touch the login lockout.

The e-mail address change confirmation (issue #3840, item 4) uses the same token handling.

## Consequences

- People can help themselves when they have an address on the account; everyone else still goes to
  an administrator.
- A leaked database, mailbox backup or log file does not give anyone a working link for longer than
  an hour, and the logs never hold one at all.
- Every deployment that wants the feature needs `tafeladmin.server.publicUrl` set. Forgetting it
  switches the feature off quietly rather than sending a broken link.
- Whoever controls the mailbox controls the account's password. That is the point of the feature, and
  why the second factor stays in place.
- The e2e profile now delivers mails to a Mailpit instance (a service of the CI e2e job, the
  docker-compose container locally), so a spec can read the link from a real mail.

## Alternatives considered

**Token in a query parameter.** This lost because it ends up in `access.log`, the proxy's log and the
browser history: the problem ADR-0057 already solved for search terms.

**Building the link from the request's `Host` header.** This lost because the caller controls that
header, so the link in somebody else's mail would point wherever the caller wanted.

**A code to type in instead of a link** (like the e-mail second factor). This lost because a six-digit
code would need a lockout of its own against guessing, and to someone locked out of their account a
link is the simpler path.

**Storing the token in plain text.** This lost because anyone who can read the table could then reset
any password.

## References

- Issue #3840 (item 3)
- `PasswordResetService`, `PasswordResetController`, `SingleUseToken`, `MailedTokenCleanupService`,
  `R__00135_password_reset_tokens.sql`
- Frontend: `common/views/password-reset/`
