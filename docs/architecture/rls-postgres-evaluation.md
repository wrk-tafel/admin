# PostgreSQL Row Level Security — evaluation

Analysis for [issue #3411](https://github.com/wrk-tafel/admin/issues/3411), which asks whether
Postgres Row Level Security (RLS) makes sense here and whether it would improve security. This is
an evaluation, not a decision record — nothing here is decided, and acting on any of it needs its
own ticket.

**Recommendation up front: no RLS.** RLS solves two problems this application doesn't have —
per-tenant row isolation and per-record ownership within a permission — and doesn't solve the two
gaps that actually exist in this area, which are already tracked elsewhere. [§5](#5-what-to-do-instead)
covers what to do about those instead.

## 1. What "access control" means here today

Authorization is entirely application-layer, and it is shaped by *feature*, not by *row*
([ADR-0006](adr/0006-stateless-jwt-cookie-authentication.md)). `UserPermissions` is a flat,
per-feature enum (`CUSTOMER`, `CUSTOMER_DOCUMENTS`, `LOGISTICS`, `AUDIT_LOG`, `USER_MANAGEMENT`,
`SETTINGS`, `ADMINISTRATOR`, …), enforced with `@PreAuthorize` on every controller method. Whoever
holds `CUSTOMER` can read and write *every* household; whoever holds `SETTINGS` can manage *every*
shelter, shop, car and employee. There is no "only the households you registered", "only your
shelter" or "only your branch" restriction anywhere in `household`, `logistics`, `distribution`,
`user` or `settings` — `HouseholdEntity.issuer` and similar `createdBy`/`issuedBy` fields are
attribution (who did this), never an access filter (who may see this).

The one place a genuine "only your own row" rule exists is push notification subscriptions and
preferences — `PushSubscriptionRepository.findAllByUserId`/`findByIdAndUserId`,
`PushPreferencesRepository`/`PushTypePreferenceRepository`, both keyed by the caller's id read out
of `SecurityContextHolder`. It's a two-line `WHERE user_id = :currentUser` in the repository layer,
the same shape as the self-service GDPR export at `/api/users/export`.

The database itself draws no line at all: every environment — local, e2e and production — runs
under a single Postgres role, `tafeladmin` (`docker-compose.yml`, `application-local.yml`,
`application-e2e.yml`, the operator-managed production `config.yml`). That same role owns every
table, runs Flyway migrations (`FlywayConfig` builds its `FlywayMigrationStrategy` from the same
`DataSource` bean the JPA layer uses — no separate migration credential), and answers every JPA
query the application ever issues. No migration anywhere creates a second role, and nothing in the
backend issues `SET ROLE`, `SET SESSION AUTHORIZATION`, `set_config` or reads `current_setting` —
grepping the whole backend source for any of them returns nothing.

## 2. What RLS actually buys, measured against that

RLS's value proposition is a policy that restricts which *rows* a query sees, enforced by Postgres
itself rather than by the caller remembering a `WHERE` clause. That is worth having when either of
two things is true: several tenants share the same tables, or two people who both may query a table
are nonetheless meant to see different rows of it. Neither holds here.

- **No tenancy.** [ADR-0003](adr/0003-postgresql-as-the-only-infrastructure-dependency.md) and
  CLAUDE.md's module list describe one deployment serving one organisation — not several food banks
  partitioned in a shared schema. `shops` ("Filialen") and `shelters` are global reference/admin-CRUD
  tables under `settings`, visible to anyone holding `SETTINGS`, not an isolation boundary between
  tenants. There is no `tenant`/`mandant`/`organisation` column anywhere to key a policy on.
- **No intra-permission row ownership, except the one place already solved.** Everywhere RLS would
  normally earn its keep — "user A and user B both have `CUSTOMER` but must see different
  households" — the actual rule is "both see everything", by design. There is no predicate to write
  a `CREATE POLICY ... USING (...)` for, because the correct row set for every `CUSTOMER` holder
  really is *all rows*. The one case where a genuine per-row rule exists (push subscriptions) is
  already a two-line repository filter, not a gap RLS would close.

So the two conditions that make RLS pay for itself are both absent. What's left is RLS as pure
defense-in-depth against a bug that queries too broadly — and that defense only has something to
catch when there's a narrower "correct" result the buggy query failed to filter to. Since the
correct result for household/shelter/employee queries genuinely is "everything", there's no
narrower boundary for a missing `WHERE` clause to have leaked across.

## 3. What RLS would cost here

Enabling RLS on this schema is not "add a policy and done" — the current setup fights it on two
independent fronts.

**The table owner is exempt by default, and the table owner is the only role that exists.**
Postgres RLS does not apply to a table's owner unless the table is explicitly altered with `FORCE
ROW LEVEL SECURITY`. `tafeladmin` owns every table — it's the role that ran every migration. Turning
on RLS without also forcing it, and without also introducing a second, more restricted role for
runtime queries, would enable policies that silently never apply to any query the application ever
issues. That second role is real, separate work: someone has to decide what it can and can't do
relative to `tafeladmin` (which still needs full rights to run migrations), and the app's one shared
`DataSource`/Hikari pool would need to connect as it instead.

**Session-scoped policies don't survive a pooled connection.** A policy that depends on *which
application user is asking* — the only kind of policy that would be new information here — needs
that identity inside the Postgres session, typically via `SET LOCAL app.current_user_id = …` at the
start of each transaction. The Hikari pool here is built once at startup and its connections are
reused across unrelated requests and unrelated logged-in users for the life of the process
(`application.yml`'s `hikari` block, sized for "a handful of simultaneous users plus the `@Async`
executor's 10 threads"). Nothing today sets or resets a session variable per checkout — no
`Connection`-level interceptor, no Hibernate physical-connection-handling hook. Adding one is a new
piece of infrastructure whose only job is feeding RLS, for a boundary (push subscriptions) that a
`WHERE` clause already enforces correctly today.

## 4. The two things this evaluation did turn up — and why they aren't RLS-shaped

`docs/architecture/gdpr-compliance.md` already names the two real gaps in this area, and both
predate this issue:

- **G7**: `CUSTOMER` grants read and write on every household, and nobody has written down who holds
  it or why (tracked in #3185). This reads like a row-level question but isn't one — the fix already
  in use for exactly this shape of problem is splitting the *permission* more finely
  ([ADR-0050](adr/0050-customer-documents-split-into-its-own-permission.md) did it for
  `CUSTOMER_DOCUMENTS`), not filtering rows within one permission. RLS has no policy to express here:
  the open question is "should this feature exist as one grant or two", which is a
  `@PreAuthorize`-and-permission-enum decision, not a data predicate.
- **G11**: built `ExcessiveReadAccessDetectionService`, a fixed hourly-read-count threshold, precisely
  because there is no preventive row-level control stopping one authorized staff member from reading
  a household that a different authorized staff member could equally read. That's a deliberate
  detect-after-the-fact design, not an oversight RLS would close — the application still can't say
  in advance "this household is off-limits to this particular `CUSTOMER` holder", because no such
  rule exists to enforce; every `CUSTOMER` holder is legitimately allowed to look up any customer
  during their work.
- **Hand-run SQL against production** is the one spot where RLS's actual selling point —
  enforcement that raw SQL can't route around — would apply: such a query passes no `@PreAuthorize`
  and produces no `audit_log` entry. No such script exists in this repository today, but the reasoning
  stays relevant if one is ever added. It still wouldn't fit: whoever runs a hand-written query
  typically connects with the same `tafeladmin` credential the application uses, which (per
  [§3](#3-what-rls-would-cost-here)) is exempt from RLS as the table owner unless forced, and a person
  trusted with that credential can `SET`/reset whatever a policy checks anyway. Closing that gap needs
  a distinct, lower-privileged credential for ad hoc/reporting access (and ideally an audited path
  instead of a raw `psql` session) — RLS policies are what you'd add *after* that role exists, not
  instead of creating it.

## 5. What to do instead

Neither gap needs a schema change:

1. **G7's open question — who holds `CUSTOMER` and why — is an organisational answer, not a
   technical one.** It's already tracked under #3185; nothing here changes that.
2. **If ad hoc/direct SQL access is a real enough risk to close** (the §2 concern above), the
   matching fix is a separate, restricted database role for that access path — distinct from the
   single `tafeladmin` role the application and its migrations use — with its own grants, not row
   policies layered onto a schema where the app's own role is the owner. That's a bigger, standalone
   piece of work (a new role, a decision about what it can touch, and how people authenticate as it)
   and would need its own ticket if pursued.
3. **Keep using repository-level `WHERE` filters for the one legitimate per-row rule that exists**
   (push subscriptions/preferences, self-service export). It's simple, unit-testable in Kotlin, and
   doesn't need the session-variable plumbing RLS would require under a pooled connection.

## 6. When this should be revisited

- **Multi-tenancy.** If this application ever hosted more than one food bank's data in the same
  database — several organisations sharing tables instead of one deployment per organisation — that
  is exactly RLS's home case, and this recommendation would flip.
- **A genuinely separate, less-trusted database credential.** If a reporting tool, a BI connection or
  an external integration ever queries this database with its own role rather than through the
  application, RLS policies on that role (with `tafeladmin` still exempt or forced appropriately) are
  the right tool — but the role has to exist first.
- **A row-level access rule inside an existing permission.** If a future feature genuinely needs "you
  may only see households/shelters/whatever you're assigned to" rather than "everyone with this
  permission sees everything", that's the point where a `WHERE`-clause filter — or RLS, if the same
  rule needs to hold even against direct SQL — becomes worth designing, not before.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/auth/model/UserPermissions.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/push/internal/PushSubscriptionRepository.kt`,
  `PushPreferencesRepository.kt`, `PushTypePreferenceRepository.kt` — the one existing per-row rule
- `backend/src/main/resources/application.yml` — `spring.datasource`/`hikari` (single pooled role)
- `docker-compose.yml`, `_build/Dockerfile` — the single `tafeladmin` role in every environment
- [ADR-0006](adr/0006-stateless-jwt-cookie-authentication.md) — permission model
- [ADR-0003](adr/0003-postgresql-as-the-only-infrastructure-dependency.md) — Postgres as the only
  infrastructure dependency
- [ADR-0050](adr/0050-customer-documents-split-into-its-own-permission.md) — splitting a permission
  instead of filtering rows, for the same shape of problem G7 raises
- [`gdpr-compliance.md`](gdpr-compliance.md) — G7 (undifferentiated `CUSTOMER`), G11 (excessive-read
  detection), §2 (unaudited direct SQL)
