# ADR-0062: A mandatory second factor also requires an e-mail address on file

**Status:** accepted · **Recorded:** 2026-09-27

## Context

[ADR-0058](0058-two-factor-authentication-gates-the-session-not-the-page.md) lets an operator require every user
to have a second factor (`tafeladmin.mfa.required`): "required" meant *at least one* of the two methods, and the
e-mail address stayed optional everywhere else - a user whose method is the authenticator app was never asked for
one.

That left a gap once [ADR-0061](0061-mandatory-two-factor-setup-happens-in-the-login-flow.md)'s login-flow setup
wizard made it easy to notice: an account can go its entire life with no e-mail address at all, even on a
deployment that has gone out of its way to require a second factor. That address is also where
`AccountSecurityNotificationService` sends the security mails ADR-0058 and ADR-0059 already rely on (a method
switched on or off, a reset by an administrator, an address change) - on a `required` deployment, a user with no
address misses every one of those, and an administrator resetting their second factor (`DELETE
/api/users/{id}/mfa`) has no way to tell them it happened.

## Decision

**While `tafeladmin.mfa.required` is on, an e-mail address is mandatory for every account - independently of which
second-factor method is chosen.** A user whose only method is the authenticator app still owes one.

- `TafelJwtAuthProvider.mfaSetupRequired` is `properties.mfa.required && (!userEntity.hasMfa ||
  userEntity.email.isNullOrBlank())` - two independent gates behind one flag, computed per request like the rest
  of the required-MFA state, so switching the setting on reaches sessions that are already open the same way a
  missing method already did.
- `UserController.validateEmailPresentIfMandatory` refuses a blank e-mail address on every write of the field
  while it is on: `updateAccount` (self-service, "Meine Daten"), and `createUser`/`updateUser` (an administrator
  creating or editing someone else's account). This is a business-rule check, not a DTO-level `@NotBlank` -
  `UserAccountRequest`/`UserRequest`'s `email` stays nullable, since the field is genuinely optional whenever the
  deployment does not require a second factor.
- The login-flow setup wizard (`LoginMfaSetupComponent`, ADR-0061) treats the address as its own step, shown ahead
  of and independent from the method chooser: a session that already has a method but no address sees only the
  address field, never the method chooser again; a session with neither sees both, the address first. Saving the
  address does not, by itself, start the e-mail method - `MfaService.startEmailSetup` is a deliberate, separate
  action, since the address may be the whole gap on its own (an existing method already satisfies "required").
  Closing either step re-reads `AuthenticationService.isMfaSetupRequired()` from a fresh `GET /api/users/info`
  rather than assuming the step just closed was the last one, and either continues the login or re-renders for
  whatever remains.

## Consequences

- **A deployment that turns this on can retroactively lock out a compliant user.** Someone who already satisfies
  `mfa.required` with the authenticator app alone, but has no address on file, is sent back to the setup wizard on
  their next login (or next navigation, if their session is already open) - not because their method stopped
  counting, but because the address is now also owed. This is the same operational trade-off ADR-0058 already
  accepted for the method itself ("locks them out of everything but the setup page - which is where they can fix
  it"), extended to the address.
- **The settings page ("Mein Konto") and the login-flow wizard diverge slightly on purpose.** The settings page's
  "Code per E-Mail" section still only ever asks for an address in service of that specific method (unchanged
  from ADR-0058); the wizard's address step exists independently of any method, because a session stuck there may
  never reach the settings page's own "Meine Daten" tab (that tab needs the session already unblocked). Two
  affordances for the same field, but only the wizard's is unconditional.
- **An administrator cannot create a non-compliant account either.** `createUser`/`updateUser` refuse a blank
  address the same way `updateAccount` does, so a deployment cannot end up with an account that was compliant by
  construction and only breaks that on first login.

## Alternatives considered

- **Require the e-mail-code method specifically, not just an address.** Rejected for now (tracked in
  [#3749](https://github.com/wrk-tafel/admin/issues/3749)) - it would make TOTP-only insufficient, which is a
  materially bigger change (touches `UserEntity.hasMfa` itself, not just what gates the session) and would need
  its own migration story for existing TOTP-only users. An address is a much smaller ask and already covers the
  motivating problem (security mails with nowhere to go).
- **A DTO-level `@NotBlank` on `email`.** Would need the constraint to depend on runtime configuration
  (`tafeladmin.mfa.required`, hot-reloaded), which Bean Validation annotations cannot express - a manual check
  next to the other business-rule validations in `UserController` was simpler than a custom conditional validator.
- **Auto-starting the e-mail method once the address is saved in the wizard.** The original, simpler wizard did
  this (see ADR-0061's first version), but it assumed the address was always being entered *for* the e-mail
  method - wrong once the address became mandatory on its own: a user who already has the app and just needs an
  address would be pushed into setting up a second method they never asked for.

## References

- `TafelJwtAuthProvider`, `UserController.validateEmailPresentIfMandatory`, `LoginMfaSetupComponent`
- [ADR-0058](0058-two-factor-authentication-gates-the-session-not-the-page.md),
  [ADR-0061](0061-mandatory-two-factor-setup-happens-in-the-login-flow.md)
- [#3749](https://github.com/wrk-tafel/admin/issues/3749) - the deferred, bigger question of requiring the e-mail
  method itself
