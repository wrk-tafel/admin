# ADR-0061: A mandatory two-factor setup happens in the login flow, not inside the application

**Status:** accepted · **Recorded:** 2026-09-27

## Context

[ADR-0058](0058-two-factor-authentication-gates-the-session-not-the-page.md) lets an operator require every user
to have a second factor (`tafeladmin.mfa.required`). A user who has none yet still gets a session after the
password step - one with no permissions - and that ADR originally had the frontend send such a session to the
account page's `zwei-faktor` tab (`AuthGuardService` let `konto` and `zwei-faktor` through, every other route
redirected there): the application's shell (sidebar, header, "Mein Konto" frame) rendered around a page that was,
functionally, still part of completing the login.

That put a login step behind the application's own chrome:

- The tab lives among five others (Meine Daten, Passwort, Benachrichtigungen, Design, Datenschutz) that a
  forced-setup session must not use yet - `AuthGuardService` had a `MFA_SETUP_PATHS` allow-list just to keep those
  reachable-by-URL while still blocking the rest, which existed only to patch around the tab being inside a
  multi-tab settings page in the first place.
- The e-mail method needs an address on the account, which is entered on the *different* "Meine Daten" tab - a
  tab the guard did not allow, so a user with no address on record and no authenticator app on hand had no way to
  finish the setup at all (found while building this ADR's change).
- A user who wanted to back out could not without knowing to use the browser's own logout, since "abandon this and
  log out" is a login-flow affordance, not a settings-page one.

## Decision

Setting a second factor up while it is required happens on its own page in the login flow,
`LoginMfaSetupComponent` (`common/views/login-mfa-setup/`), reached at `/login/mfa-einrichtung` - the same place in
the URL space as `LoginMfaComponent`'s `/login/mfa` for a code that is merely owed. It renders outside the
application shell, with the same look as the plain login and password-change pages, not the settings page's chrome.

- `AuthGuardService` no longer special-cases any path: every route redirects to `/login/mfa-einrichtung` while
  `AuthenticationService.isMfaSetupRequired()`, full stop. The account page's `zwei-faktor` tab is reachable again
  only once a method exists, exactly like every other route.
- The page offers both methods (authenticator app, e-mail code), same as the settings tab, and completes the login
  exactly where a plain one would have (the overview, or a still-due password change) once either is accepted -
  it does not also render the settings-page features that don't apply here (disabling a method, adding a *second*
  one next to a first).
- **The e-mail address is now collected on this same page** when the account has none: `MfaPendingFilter`'s
  allow-list for such a session was widened to `GET`/`PUT /api/users/account` (previously only the `/api/mfa/*`
  setup calls and `/api/users/info`/`logout`), so the page can read and save the caller's own name/e-mail the same
  way "Meine Daten" does, without sending the user there.
- `AuthenticationService.redirectToMfaSetup()` now points here instead of `/konto/zwei-faktor`; `LoginComponent`
  does the same right after a successful password step.
- A "Abbrechen und abmelden" button, like the code-entry page already has, ends the session instead of leaving the
  user stuck with nothing else usable.

## Consequences

- **Forced setup is symmetric with the pending-code page now**: both live in `common/views/`, both are reached
  under `/login/*`, both are the last thing standing between a password and a full session. A future login-flow
  step has a template to follow.
- **The settings page's two-factor tab is simpler**: it no longer has a "nothing is set up and none of this page
  works yet" branch (the `setupRequired` computed and its banner were removed from `UserMfaComponent`), since that
  state can no longer be reached there.
- **One more account endpoint is reachable before a second factor exists.** `GET`/`PUT /api/users/account` only
  let the caller read and change their own name/e-mail (see `UserController.updateAccount`'s KDoc) - the same
  narrow surface "Meine Daten" already exposed to a completed session - so this does not hand a password-only
  session anything it could not already reach via the settings page before this change, just from a different URL.
- **A deep link into the application still redirects correctly.** A bookmark to any route, or a route already
  open when an operator switches the requirement on, still ends up on the setup page - only the target URL
  changed, not the fact that every route leads there.

## Alternatives considered

- **Keep `MFA_SETUP_PATHS`, add `daten` to it.** Patches the immediate "can't add an e-mail address" bug without
  addressing why a login step was inside the settings page's shell at all, and keeps two tabs of "Mein Konto"
  behaving differently depending on session state for anyone reading that component later.
- **A dedicated "add e-mail address" endpoint just for this flow.** `GET`/`PUT /api/users/account` already is the
  minimal self-service surface for exactly this; a parallel endpoint would duplicate `UserController`'s validation
  and audit-trail write for no benefit.

## References

- `LoginMfaSetupComponent` (`common/views/login-mfa-setup/`), `AuthGuardService`, `MfaPendingFilter`,
  `LoginComponent`, `AuthenticationService.redirectToMfaSetup`
- [ADR-0058](0058-two-factor-authentication-gates-the-session-not-the-page.md), which this narrows on the frontend
  redirect target only - the backend session-gating decision it records is unchanged
- The user module README's "Mein Konto" section
