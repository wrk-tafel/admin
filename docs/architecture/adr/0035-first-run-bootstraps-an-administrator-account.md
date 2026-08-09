# ADR-0035: A first run against an empty database bootstraps one administrator account

**Status:** accepted · **Recorded:** 2026-08-09

## Context

Everything in this application is behind an authenticated session, and every account is created by
someone who already holds `USER_MANAGEMENT` — plus `ADMINISTRATOR`, since only an administrator may
hand that permission out (see `UserController.validateAdministratorAssignment`). That is the right
rule for a running installation and a deadlock for a new one: a fresh deployment against an empty
database comes up with a complete schema, the reference data the migrations carry (countries, income
limits, static values) and no way to log in at all.

Until now the gap was closed by hand — a SQL insert of a user, an employee and a `users_authorities`
row against the live database, with an Argon2 hash produced somewhere outside the application. That
is error-prone (the hash format, the mandatory employee, the per-table sequences) and it is exactly
the kind of step nobody remembers a year later, when the next environment is set up
([#3103](https://github.com/wrk-tafel/admin/issues/3103)).

Whatever closes it must not become a way in for an *existing* installation. A default account with a
known password that survives beyond the first minute of a deployment's life is a worse problem than
the one being solved.

## Decision

**While the `users` table is completely empty, the application creates one administrator account at
startup — and does nothing at all otherwise.**

`InitialAdminUserService` (`common/auth/components/`) runs as an `ApplicationRunner`:

- The trigger is `userRepository.count() == 0`, not a "first boot" flag an operator sets and clears.
  An empty user table is the one state in which this can neither overwrite anything nor hand out an
  account nobody asked for, and it is self-clearing: the account it creates makes every later start
  a no-op.
- The account gets `ADMINISTRATOR` only, which grants every other permission implicitly when the
  token is minted, and `passwordChangeRequired`, so its first password cannot stay in use.
- With no `tafeladmin.setup.initialAdmin.password` configured, the password is generated per
  installation by the application's own `TafelPasswordGenerator` and logged once at WARN. Setting one
  is supported for unattended rollouts; it goes through the same `passwordValidator` as any other
  password, and an invalid one fails the startup rather than producing an installation nobody can log
  into.
- Username, personnel number and name are configurable; the whole mechanism can be switched off with
  `tafeladmin.setup.initialAdmin.enabled: false`.

## Consequences

- A new environment is `docker run` plus an empty database. The documented path
  ([README](../../../README.md#new-installation)) has no manual SQL step in it.
- No credential shared between installations exists anywhere in this repository — the default path
  generates one per installation, and the log line is the only place it appears.
- **The bootstrap is only as safe as the log.** Whoever can read the container's log during the first
  start can read that password. It is single-use in practice (the account must change it at first
  login, and any later start is a no-op), but an environment with a widely readable log should
  configure the password instead.
- The mechanism is disabled in integration tests (`src/test/resources/application.yml`), because they
  share one schema that starts empty and would otherwise see a user they did not create. Its
  behaviour is covered by `InitialAdminUserServiceTest` and by `InitialAdminUserServiceIT`, which
  boots a context of its own against a container of its own to get the empty-database state a shared
  container never has again.
- An installation that deletes its last user re-bootstraps on the next restart. That is intentional —
  it is the same recovery path as the initial one — but it means "delete every user" is not a way to
  lock an installation down. `UserController` already refuses to remove the last active administrator
  through the API, so reaching that state takes a deliberate database edit.

## Alternatives considered

**Seed the account from a Flyway migration.** Rejected: a migration can only ship a fixed password
hash, identical on every installation and readable in this repository — the default-credentials
problem in its purest form. It also could not use the application's own encoder or password rules,
and every repeatable migration re-runs against existing databases
([ADR-0004](0004-repeatable-only-flyway-migrations.md)), so the guard would have to be written in SQL
anyway.

**A CLI/one-off command (`--create-admin`) an operator runs once.** Rejected: it is another artifact
to document, ship and keep working, and it fails in the same way the manual SQL insert does — by
being forgotten. The empty-table trigger needs no operator action at all.

**A setup wizard on first HTTP request.** Rejected: it means an unauthenticated, state-changing
endpoint that must be reachable exactly once, guarded by the same "no users yet" condition — the same
rule, exposed over the network instead of decided in-process, with a window in which anyone who
reaches the deployment first owns it.

**A fixed default password (`admin`/`admin`) with a forced change.** Rejected: it is only safe until
someone reaches the deployment before the operator does, and it would be identical everywhere and
published here.

**An environment variable that must be set for the first boot, failing startup otherwise.** Rejected
as the default: it turns every new deployment into a two-step dance and gives nothing over generating
a password, which cannot be forgotten or weakly chosen. It remains available as the opt-in
`tafeladmin.setup.initialAdmin.password`.

## References

- [#3103](https://github.com/wrk-tafel/admin/issues/3103) — setup for a new installation
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/auth/components/InitialAdminUserService.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/config/properties/TafelAdminProperties.kt` —
  `TafelAdminInitialAdminProperties`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/auth/UserController.kt` — who may grant
  `ADMINISTRATOR`, and the last-administrator guard
- [ADR-0006](0006-stateless-jwt-cookie-authentication.md) — the permission model this account starts from
- [README](../../../README.md#new-installation) — the operator-facing setup steps
