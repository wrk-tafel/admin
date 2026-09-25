# ADR-0059: A completed session proves an existing second factor before it changes the second factor

**Status:** accepted · **Recorded:** 2026-09-25

## Context

[ADR-0058](0058-two-factor-authentication-gates-the-session-not-the-page.md) makes a session that has only
passed the password step unable to touch the second factor, and `MfaService.disable` asks for a code so that
"a session left open in a browser cannot take the second factor away". A review found that the neighbouring
paths did not ask the same of a *completed* session - one that has passed the second factor, which is exactly
what an open browser or a stolen `tafel-admin-jwt` cookie (10 h) is:

- `PUT /api/users/account` changed the address the e-mail method sends its codes to, with no code.
- `/api/mfa/setup` + `/enable` and `/api/mfa/email/setup` + `/email/enable` added the *other* method with a code
  of the freshly set up method only - an attacker's own authenticator app or address next to the user's.
- `PUT /api/users/{id}` (user administration) set the caller's own password and address, and an administrator's
  address, without going through any of that.
- `POST /api/users/change-password` did not count a wrong current password, so a session was an online
  oracle for the password, limited only by the Argon2 cost.

None of this grants access on its own (the password is still needed), but it turns brief access to a session
into permanent access - the case a second factor exists for.

## Decision

**Whatever changes what the second factor is asks for a code of a method the user already has.** The check is
the one `disable` uses (`MfaService.confirmExistingFactor`, wrong codes counted under `mfa:<username>`):

- **Switching a method on** (`/mfa/enable`, `/mfa/email/enable`) takes `currentCode` next to the new method's own
  code, as soon as the user has any method. The first method has nothing to prove. The two "start" calls
  (`/setup`, `/email/setup`) ask for nothing: they change nothing that counts, and asking there would need a
  one-time code of the existing method twice for one setup.
- **Changing the account's address** (`PUT /api/users/account`) takes `mfaCode` while the e-mail method is on,
  since the address is then the second factor. With only the app on, the address is not a factor and adding the
  e-mail method later proves the new address anyway, so no code is asked for.
- **The user administration cannot be the way around it:** a caller's *own* password is refused there (it is
  `POST /api/users/change-password`'s job, which asks for the current one), and so is their own address while
  their e-mail method is on. An administrator's address joins username, password and `passwordChangeRequired`
  in `validateAdministratorAccountFieldChanges` - for an administrator on the e-mail method it is the reset
  that `DELETE /api/users/{id}/mfa` already refuses to non-administrators.
- **A wrong current password is counted** like a failed login, under the username, and a locked account is
  refused without looking at the password (`TafelUserDetailsManager.changePassword`).
- **The user is told:** an address change (to the old address), a method switched on or off and an
  administrator's reset are mailed by `AccountSecurityNotificationService` through the mail outbox, so a change
  that rolls back sends nothing.
- **`tafeladmin.mfa.emailCodeForTests` only works in the `e2e` and `test` profiles.** `MfaTestCodeGuard` refuses
  to start with it set anywhere else and, because the configuration is re-read while the application runs,
  ignores it at runtime as well.

## Consequences

- Adding a second method is two codes instead of one, and a user who has only the e-mail method has to request
  the existing method's code (`POST /api/mfa/email/send`, offered on the setup forms) before adding the app.
- An address change while the e-mail method is on needs a code, so the one situation it cannot be done is
  when the mailbox is already lost - an administrator's MFA reset is then the way out, as before.
- A user cannot set their own password in the user administration any more, and cannot change their own address
  there while the e-mail method is on; the "Passwort zurücksetzen" section is replaced by a pointer.
- Wrong current passwords now feed the same lockout as a login, so someone holding a session can also lock the
  account. That is the same exposure a wrong password at the login page has.
- The mails are best effort: with no mail configured, or no address on the account, nothing is sent.

## Alternatives considered

- **Clearing `mfaEmailEnabled` when the address changes**, so the new address has to be proven again. It leaves a
  required-MFA user with no method between the two steps and makes the change a two-page flow; a code up front
  is simpler and keeps the method on.
- **A code for `/setup` and `/email/setup` as well.** Rejected for the double one-time code above; the effect
  only happens at the enable call.
- **Requiring the current password on `PUT /api/users/{id}` for the caller's own account.** Two screens would
  then set the same credential; the dedicated one already exists and has the lockout.

## References

- Issue #3736; [ADR-0058](0058-two-factor-authentication-gates-the-session-not-the-page.md)
- `MfaService`, `MfaController`, `UserController` (`updateAccount`, `validateOwnCredentialsUnchanged`,
  `validateAdministratorAccountFieldChanges`), `AccountSecurityNotificationService`, `MfaTestCodeGuard`
