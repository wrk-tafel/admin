# ADR-0057: Search endpoints take their terms in a `POST` body, not a query string

**Status:** accepted · **Recorded:** 2026-09-19

## Context

The customer, user, login-attempts, employee and Datenauskunft searches all sent their free-text
term as a `GET` query parameter (`?searchInput=...`). A search term is, in practice, a person's
name. Issue [#3506](https://github.com/wrk-tafel/admin/issues/3506) (GDPR gap G25) found that name
landing in three places this system otherwise treats as name-free: `logs/access.log` (`rotate:
false`, kept for the life of the deployment), the browser's history, and the support mail's
`clientContext`. The smallest fix at the time was narrowing `server.tomcat.accesslog.pattern` to
drop the query string (`%m %U %H` instead of Tomcat's default `%r`) and stripping the query string
from the support context.

That fix regressed in production without a single line of this repository changing. Issue
[#3703](https://github.com/wrk-tafel/admin/issues/3703) found real customer names back in
`access.log` weeks later: `server.tomcat.*` is bound once when Tomcat starts (see the Config
Hot-Reload section of `CLAUDE.md`), and production's per-deployment settings come from an
operator-managed `config.yml` outside this repository. That file had drifted back to an older,
unsafe pattern, and nothing in this codebase could have noticed — the safe pattern only exists
where an operator's config doesn't override it, which is exactly what "outside this repository"
means.

A pattern-level fix depends on every layer between the browser and the log file staying correctly
configured forever, including one this repository cannot see or test. The only fix that doesn't
depend on that is not putting the term in the URL at all — a query string is what `access.log`,
browser history and (until #3506) the support mail all had in common as their leak.

The obvious replacement is the HTTP `QUERY` method (RFC 10008) — a safe, body-carrying GET. It
isn't available yet: `RequestMethod` (Spring Framework 7.0.9, via Spring Boot 4.1.1, which is what
this project is pinned to) has no `QUERY` value — that lands only in Framework 7.1.0-M1, a milestone
build, with no GA Boot release managing it. Waiting for it would leave the regression open
indefinitely on an unknown timeline.

## Decision

**A collection endpoint that accepts a free-text search term is `POST .../search`, with the term
(and its paging/sort/filter fields) in a JSON request body — never a query parameter.**

- `POST /api/households/search` (`HouseholdSearchRequest`), `POST /api/users/search`
  (`UserSearchRequest`), `POST /api/users/login-attempts/search` (`LoginAttemptSearchRequest`),
  `POST /api/employees/search` (`EmployeeSearchRequest`) and `POST /api/data-subject-requests/search`
  (`DataSubjectSearchRequest`, replacing its previous `GET` at the same path) all take this shape.
  Each request DTO follows the existing `Request` suffix convention
  ([ADR-0008](0008-rest-api-and-dto-naming-conventions.md)) since it is bound to `@RequestBody`.
- A search endpoint moving off `GET` needs its own path segment where the bare resource path is
  already a `POST` for create (`POST /households`, `POST /users`, `POST /employees`) — hence
  `.../search` rather than reusing the collection's own base path.
- A single-resource read (`GET /households/{id}`) and a listing endpoint with no free-text term
  (e.g. `GET /households/above-limit`, whose filters are never a name) are unaffected — this
  decision is about a *search term*, not about `GET` in general.
- The frontend's public API service methods (`CustomerApiService.searchCustomer`,
  `UserApiService.searchUser`/`getLoginAttempts`, `EmployeeApiService.findEmployees`,
  `DataSubjectRequestApiService.search`) keep their existing signatures — only what they send over
  the wire changed, so every calling component is untouched.

## Consequences

- A search term can no longer reach `access.log`, browser history or a support mail's context
  through the URL, regardless of how `server.tomcat.accesslog.pattern` or any other query-string
  logging is configured on a given deployment — the class of regression in #3703 is closed at the
  source rather than patched at each place a query string might be read.
- `POST` for what is conceptually a read breaks the normal expectation that a search is
  bookmarkable/cacheable/idempotent-by-URL. Nothing in this application relied on that: none of
  these five searches were ever bookmarked or browser-cached, and the frontend's own "keep the
  search on back navigation" behavior already lives in the SPA's own URL state
  ([G25](../gdpr-compliance.md#g25-a-search-term-is-a-name-and-it-no-longer-travels-into-the-access-log-or-the-support-mail)'s
  "mixed answer"), not in the API call.
- `_http-calls/*.http` files for these four resources now show a JSON body instead of a query
  string — checked as part of this change, not left to go stale.
- This is provisional. Once Spring Boot manages a GA Spring Framework release with `RequestMethod.QUERY`
  support, these five endpoints are exactly what should migrate to it — `POST` here is the fallback
  for "a body without a query string," not an endorsement of `POST` for reads on its own merits.

## Alternatives considered

**Fail startup when the effective `server.tomcat.accesslog.pattern` contains a query-string token.**
Tried first, then rejected once #3703's investigation showed the actual gap: catching a bad
`config.yml` at the *next restart* still leaves every request between the regression and that
restart logged with a name in it, and it does nothing for the browser-history/support-mail
directions of the same leak. It also only ever detects the symptom (a bad access-log pattern), not
the underlying fact that a name is in the URL at all.

**Wait for the HTTP `QUERY` method.** Rejected for now, not permanently — see Consequences above. No
GA Spring Boot release manages a Framework version with `RequestMethod.QUERY` as of this writing, and
an issue affecting real customer data in production does not wait on an upstream release train.

**Keep `GET` and move only the term into a header.** Rejected: a header is still logged by a
sufficiently verbose access-log pattern or a proxy, is not a JSON-native place for structured filter
data, and buys nothing over a `POST` body while looking more surprising to a reader of the
controller.

## References

- Issues [#3506](https://github.com/wrk-tafel/admin/issues/3506) (original G25 fix) and
  [#3703](https://github.com/wrk-tafel/admin/issues/3703) (the regression this ADR fixes for good)
- [`docs/architecture/gdpr-compliance.md`](../gdpr-compliance.md), G25
- [ADR-0008](0008-rest-api-and-dto-naming-conventions.md) — the `Request`/`Response`/`Item` suffix
  convention these new DTOs follow
- `HouseholdController.searchHouseholds`, `UserController.searchUsers`/`searchLoginAttempts`,
  `EmployeeController.searchEmployees`, `DataSubjectRequestController.search`
- `CLAUDE.md` — "API Structure" and "Fuzzy Search"
