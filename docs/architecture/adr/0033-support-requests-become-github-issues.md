# ADR-0033: In-app support requests are filed as GitHub issues

**Status:** superseded by [ADR-0040](0040-support-requests-sent-as-mail.md) · **Recorded:** 2026-08-09

## Context

When something is wrong, the person who notices is a volunteer at a desk mid-distribution. Whatever
they have to do to report it competes with a queue of people — so it has to be one form, inside the
application they are already looking at.

On the receiving side there is no support team and no rota. The same handful of people who maintain
the code are the ones who act on reports, and they already work out of this repository's issue
tracker: that is where bugs are triaged, prioritised, referenced from commits and closed by pull
requests.

## Decision

**The in-app support form creates an issue in the project's GitHub repository, through the GitHub
API, on the user's behalf.**

- `POST /api/support` takes a title and a text; `SupportService` posts to
  `/repos/{owner}/{repo}/issues` with a configured token, a configured title prefix, and pinned API
  headers (`X-GitHub-Api-Version`).
- The repository and token come from `tafeladmin.support.*` — operator configuration, mounted only in
  production ([ADR-0011](0011-configuration-hot-reload-instead-of-restarts.md)). Neither is a
  user-supplied value.
- If the support properties or the token are missing, the endpoint fails with a clear German message
  saying support contact is not configured, rather than silently swallowing the request.
- The `owner/repo` string is interpolated into the URI directly and deliberately, with the reason
  recorded at the call site: it comes from trusted config, and a URI template variable would
  percent-encode the `/`.

## Consequences

- A report lands where the work actually happens, already in the tracker, with no re-typing and no
  inbox in between. It can be labelled, linked to a commit and closed by a pull request like any
  other issue.
- Reporting costs the user one form inside the app.
- **Issues in this repository are public.** Anything a user types into the form becomes publicly
  visible, which matters for a system holding personal data — a well-meant "Kunde Müller kann sich
  nicht anmelden" publishes a name. This is the sharpest consequence of the decision, and the user
  guide's description of the form carries the warning, since the form's users are the ones who can
  act on it.
- The feature depends on an external service and a token: GitHub being down, or the token expiring or
  being revoked, breaks it. The explicit "not configured" errors are what keep that visible instead
  of silent.
- The token is a credential with write access to the repository, held in the production config.
- No deployment other than the project's own can use the feature without configuring its own
  repository and token — correct, but it does mean the feature is inert by default.

## Alternatives considered

**Send support requests by email.** Rejected: it lands in an inbox rather than the tracker, so it has
to be re-entered by hand to be worked on, and it has no state anyone can see.

**A dedicated helpdesk/ticketing product.** Rejected: another system to run, pay for and check, for a
volume of a few reports per month, and it would sit apart from the tracker where the work happens.

**Store support requests in the application's own database with an admin screen.** Rejected: it would
reimplement an issue tracker — comments, states, assignment, notifications — next to one that already
exists and is already watched.

**A link to the GitHub issue form instead of an in-app form.** Rejected: it requires the user to have
a GitHub account and to leave the application mid-distribution.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/support/`
- `TafelAdminProperties.TafelAdminSupportProperties`
- `docs/userguide/` — the support form as documented for users
</content>
