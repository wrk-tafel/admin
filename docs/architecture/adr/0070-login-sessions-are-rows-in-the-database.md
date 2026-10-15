# ADR-0070: Login sessions are rows in the database (Spring Session JDBC), not signed cookies

**Status:** accepted · **Recorded:** 2026-10-15

Supersedes the session half of [ADR-0006](0006-stateless-jwt-cookie-authentication.md) (its permission
model stands) and changes how [ADR-0058](0058-two-factor-authentication-gates-the-session-not-the-page.md)
gates a session - the decision there stands, its mechanics are described here.

## Context

[ADR-0006](0006-stateless-jwt-cookie-authentication.md) kept the session in a signed JWT cookie, valid
for ten hours, and accepted that **a token cannot be revoked before it expires**. That acceptance had
already worn thin: `users.token_invalidated_at` ("every token issued before this moment is invalid",
`R__00109`) was added so that a logout and a password change could cut a stolen cookie off - but it can
only ever cut off *all* of a user's tokens, a logout on one device logged out every other one, and
nothing could say where a user is logged in at all.

Two things asked for more:

- **Users want to see and end their own logins** - the PC at the distribution somebody forgot to log out
  of, the phone that was lost - and administrators want to end all logins of an account (#3841).
- **"Angemeldet bleiben"** (#3843) needs a long-lived login, and a long-lived login that cannot be revoked
  one by one is exactly the thing not to build.

ADR-0006's own reason against server-side sessions was "state in the app process, and a
stickiness/replication question the moment anything about the deployment changes". That question was
asked since ([ADR-0069](0069-prod-is-deployed-without-downtime-and-without-a-deploy-window.md)): prod
runs two instances side by side during a deploy. But the state does not have to live in the process -
Postgres is already shared by every instance and is where everything else the application keeps lives
([ADR-0003](0003-postgresql-as-the-only-infrastructure-dependency.md)).

## Decision

**A login is a row in `spring_session` (Spring Session JDBC); the cookie `tafel-admin-session`
carries nothing but its random id. The JWT is gone, and so is `users.token_invalidated_at`.**

- **The schema comes from Flyway** (`R__00133_spring_session.sql`, Spring Session's own Postgres
  schema); `spring.session.jdbc.initialize-schema: never`.
- **A session holds strings only** (`TafelSessionAttributes`): the username, whether the second factor
  was passed, a random *session key*, the browser's User-Agent. No Java-serialized `SecurityContext`:
  an object of one of this application's classes, written by one version, might not read in the next,
  which would log everybody out at some deploy nobody planned for. The `Authentication` is rebuilt
  from those strings on every request (`TafelSessionAuthConverter`, `TafelSessionAuthProvider`), with
  the permissions read from the database as before - so a permission change, a disabled account or a
  newly required second factor still counts on the very next request.
- **Spring Security itself stays `STATELESS`** and keeps nothing in the session; its session fixation
  protection is off, because it would mistake every request's freshly rebuilt `Authentication` for a
  login and change the session id each time. Fixation is handled where it belongs instead
  (`UserSessionService`): a login always gets a new session, and passing the second factor changes the
  session id.
- **Only `/api` requests that are not public load the session** - `request.getSession(false)` in
  `TafelSessionAuthConverter` is what reads the row, so a static file never touches the table.
- **Lifetime is counted from the login**, as the JWT's was: ten hours, five minutes while a password
  change or the second factor is still owed (`security.session`). Spring Session's own inactivity
  timeout is set to the same values, which is what lets its cleanup delete the row.
- **Ending a session deletes its row** (`UserSessionService`): logging out ends the current one only;
  "Mein Konto" > "Sitzungen" ends one or all others (`UserSessionController`, `GET`/`DELETE
  /api/users/sessions`); an administrator ends all of an account's (`DELETE /api/users/{id}/sessions`,
  `USER_MANAGEMENT`); a new password ends all others, and disabling, renaming or deleting an account ends
  all of them. The API names a session by its key, never by the id the cookie carries.
- **An ended session's open event stream ends too, on every instance.** Ending publishes a
  `SessionsEndedEvent` on the SSE outbox ([ADR-0005](0005-server-sent-events-with-a-transactional-outbox.md));
  each stream listens for its own key (`SseEventsController`) and completes, the browser reconnects
  and is refused.
- **The second factor is a session attribute** instead of a JWT claim: `MfaPendingFilter` and the
  rule that a password alone opens nothing are unchanged ([ADR-0058](0058-two-factor-authentication-gates-the-session-not-the-page.md)),
  only where "passed" is written down moved. `tafeladmin.mfa.required` works as before.
- **CSRF** stays the cookie token of ADR-0006, its value derived from the session cookie
  (`SessionBoundCsrfTokenRepository`, a SHA-256 over a fixed label and the cookie value) instead of an
  HMAC of the JWT - it needs no secret of its own, and still converges for the SPA's parallel first
  requests (#3101).
- **Expired rows are deleted by Spring Session's own cleanup**, every minute on every instance: a
  plain `delete ... where expiry_time < ?`, which two instances can run at the same moment without harm
  - so it is kept rather than replaced by a row-claiming job ([ADR-0047](0047-scheduled-jobs-coordinated-by-rows-first-shedlock-second.md)
  asks for that where two instances would otherwise *double* the work, not where the second delete
  simply finds nothing).

### This one release breaks the two-versions-at-once rule, on purpose

[ADR-0069](0069-prod-is-deployed-without-downtime-and-without-a-deploy-window.md) asks that for the
half-minute of a deploy the old version keeps working against the new schema. This change does not
try to: the release that brings the sessions also drops `token_invalidated_at`, which the previous
version reads, and no session of one version is accepted by the other. For that half-minute a request
that reaches the old instance may fail, and **every user has to log in once more** after the deploy.

That is accepted here, and only because of when it happens: releases go out on a Friday and the
application is used on Saturdays, so nobody is working during the deploy, and a one-time login on
Saturday morning costs nobody anything. Doing it in two releases - sessions and JWT accepted side by
side first, the JWT and the column dropped a release later - would have kept every login alive, at
the price of a second authentication path to write, test and then remove. **It is not a precedent:**
a change whose deploy can land while people work still follows ADR-0069.

## Consequences

- A login can be listed and ended one by one, and ending it takes effect on the next request, on any
  instance. Logging out no longer logs out the user's other devices.
- **Every authenticated API request reads the session row, and writes it back** (Spring Session
  updates the last access time). That is one indexed read and one small update per request - noticeable
  against a JWT's zero, irrelevant against the queries a request makes anyway.
- **One more table holds personal data**: the User-Agent of every login, for at most the session's
  lifetime (see `docs/architecture/gdpr-compliance.md`).
- **Session attributes have to stay strings.** Putting an object of one of this application's classes
  into the session would bring back exactly the deploy-time logouts the rule avoids.
- The cookie keeps the JWT's properties: `HttpOnly`, `SameSite=Strict`, `Secure` behind TLS, path
  `tafeladmin.server.relativeBaseUrl`, and a `Max-Age` of the session's lifetime, so a login survives
  a browser restart as it did before.
- `security.jwtToken.*` is gone from the configuration. A deployment's `config.yml` that still sets it
  starts as before - unknown keys are ignored - and can drop it at leisure. jjwt itself stays, for the
  VAPID signature of Web Push (`VapidSigner`).
- This is what "Angemeldet bleiben" (#3843) builds on: a longer lifetime for a session that can be
  ended like any other.

## Alternatives considered

**Keep the JWT and add a denylist.** A table of revoked token ids, checked per request. It is the
same per-request read as a session table, plus the JWT handling, and it still could not *list* a
user's logins - that needs a row per login, which is a session table.

**Two releases: sessions alongside the JWT first, the JWT later.** Keeps every login alive across the
deploy, as ADR-0069 asks in general. Not worth a second authentication path here, for the reason given
under "This one release breaks the two-versions-at-once rule".

**Spring Security's own session handling** (a serialized `SecurityContext` in the session,
`HttpSessionSecurityContextRepository`). Less code, but exactly the Java-serialized object of our own
classes that a deploy can fail to read back.

**Spring Security 7's multi-factor authorities** (`FactorGrantedAuthority`) instead of
`MfaPendingFilter`. A cleaner expression of "this session passed both factors", but a rework of every
authorization rule at the same time as the session store; `MfaPendingFilter` already denies by default
and has its tests, so it stays.

**Replace Spring Session's cleanup by a row-claiming job.** Two instances deleting the same expired
rows find nothing to fight over; there is no work to share out.

## References

- #3841, #3843
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/auth/components/UserSessionService.kt`,
  `TafelSessionAttributes.kt`, `TafelSessionAuthConverter.kt`, `TafelSessionAuthProvider.kt`,
  `TafelSessionAuthenticationFilter.kt`, `SessionBoundCsrfTokenRepository.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/auth/UserSessionController.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/config/WebSecurityConfig.kt`, `SessionCookieConfig.kt`
- `backend/src/main/resources/db-migration/R__00133_spring_session.sql`,
  `R__00134_drop_users_token_invalidated_at.sql`
- `frontend/src/main/webapp/src/app/modules/user/components/user-sessions/`
