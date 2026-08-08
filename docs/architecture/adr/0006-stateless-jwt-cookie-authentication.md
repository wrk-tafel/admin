# ADR-0006: Stateless JWT-in-cookie authentication with fine-grained permissions

**Status:** accepted · **Recorded:** 2026-08-09

## Context

The clients are a browser SPA served from the same origin as the API ([ADR-0002](0002-single-deployable-image-with-independent-builds.md))
and a handful of shared-device logins in the distribution hall (scanner stations, the ticket-screen
display). There is no third-party client, no mobile app and no OAuth provider to federate with — the
organisation manages its own user records, including personnel numbers linked to employees.

Access is not role-shaped. "Who may see customer duplicates" is a different question from "who may
open a distribution" and from "who may edit settings", and the answers are handed out per person by
the leadership team. Screens and API endpoints both need to respect that, and new admin features add
new permissions regularly.

## Decision

**Session state lives in a signed JWT carried in a cookie; Spring Security is configured
`STATELESS`; authorisation is expressed as fine-grained permissions, not roles.**

- Login is HTTP Basic against `/api/login` (`TafelLoginFilter`), which validates credentials and
  issues the JWT as a cookie whose path is `tafeladmin.server.relativeBaseUrl`.
- Every subsequent `/api/**` request is authenticated by `TafelJwtAuthenticationFilter` from that
  cookie. `SessionCreationPolicy.STATELESS` means the server keeps no session; the token is the
  session.
- Passwords are hashed with **Argon2** through a `DelegatingPasswordEncoder` (`{argon2}` prefix), so
  the parameters can be raised later without invalidating stored hashes. New and changed passwords
  are checked by Passay rules — length, not-the-username, no whitespace, and a dictionary of
  organisation-specific substrings.
- Authorisation is a `UserPermissions` enum (`CHECKIN`, `CUSTOMER`, `CUSTOMER_DUPLICATES`,
  `LOGISTICS`, `STATISTICS`, `SUPERVISOR`, …), grouped into OPERATIONS / TRANSPORT / LEADERSHIP /
  ADMINISTRATION for presentation only. The backend enforces it with `@PreAuthorize` on controller
  methods; the frontend mirrors it with route guards and the `tafelIfPermission` directive.
- CSRF protection uses a cookie token repository wrapped in `SessionBoundCsrfTokenRepository`, so the
  token is bound to the session rather than rotating per request, with `/api/login` excluded (it
  authenticates via the `Authorization` header, which a cross-site request cannot set, and the client
  has no token yet at that point).
- Repeated failed logins are tracked and locked out by `LoginAttemptService`, serialized across
  concurrent attempts by an advisory lock.
- A Content-Security-Policy header is set in the same filter chain; `style-src` needs
  `'unsafe-inline'` because Angular injects component styles as inline `<style>` tags.

## Consequences

- No server-side session store to size, replicate or expire — which is what keeps the single
  deployable genuinely stateless apart from the database.
- **A token cannot be revoked before it expires.** Disabling a user stops the next login, not the
  current token. Accepted for this user population and lifetime; anything stronger would mean a
  server-side denylist and therefore state.
- The cookie's path is tied to `relativeBaseUrl`, so a deployment mounted at a different prefix must
  set it or authentication silently fails on the first API call after login.
- The frontend's permission checks are UX, never enforcement. Every endpoint carries its own
  `@PreAuthorize`; an ArchUnit rule additionally requires controllers to be mapped under `/api` so
  the security filter chain actually covers them.
- Adding a permission is a five-place change (enum, `application.yml` description, `@PreAuthorize`,
  frontend guard/directive, user-management UI). That repetition is the cost of not collapsing the
  model into a few coarse roles.
- SSE endpoints need explicit handling: the container re-enters the filter chain on the `ASYNC`
  dispatch when an emitter completes, where the `OncePerRequestFilter` no longer re-authenticates —
  hence the explicit `dispatcherTypeMatchers(ASYNC).permitAll()`.

## Alternatives considered

**Server-side HTTP sessions.** The simpler default, and rejected mostly for what it implies rather
than what it costs today: session state in the app process, and a stickiness/replication question the
moment anything about the deployment changes. The JWT keeps the process disposable.

**An external identity provider (OIDC).** Rejected: there is no directory to federate with, and the
user records carry organisation-specific data (personnel number, linked employee) that the app owns
anyway.

**Coarse roles instead of permissions.** Rejected: access here genuinely is per-feature. Roles would
either be a role per feature under another name, or would grant people more than intended.

**Token in `localStorage` with an `Authorization` header.** Rejected: an `HttpOnly` cookie is not
reachable from injected script, and the SPA is same-origin so there is nothing to gain from manual
header handling.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/config/WebSecurityConfig.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/auth/` — filters, providers,
  `LoginAttemptService`, `UserPermissions`
- `frontend/src/main/webapp/src/app/common/security/`
- `CLAUDE.md` — "Adding a New Permission"
</content>
