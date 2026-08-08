# ADR-0011: Configuration is reloaded on a running instance instead of requiring a restart

**Status:** accepted · **Recorded:** 2026-08-09

## Context

Production settings come from a single operator-managed `config.yml` bind-mounted into the container
(`-Dspring.config.additional-location=file:/app/config/config.yml`). Spring binds that file once at
startup, so changing anything in it — including a single feature flag — used to mean restarting the
container.

On this deployment a restart is not cheap. It runs Flyway migrations on boot, it drops every open
SSE stream, and it is exactly the event that must not happen during a Saturday distribution
([ADR-0013](0013-saturday-production-deploy-freeze.md)). Meanwhile some settings genuinely want to be
flipped while the app is live — the scanner-folder feature and its kill switch being the obvious
case.

Note that this is about *operator* configuration. Anything a user can change at runtime belongs in
the `settings` module and lives in the database, not in a file.

## Decision

**A background service watches the config files the application was started with and refreshes the
whole configuration in place when they change.**

- `ConfigFileReloadService` polls those files (default every 5s, `tafeladmin.configReload.interval`)
  and, on a change, runs Spring Cloud's `ContextRefresher` (`spring-cloud-context` — the only Spring
  Cloud artifact here: no config server, no client, no bus).
- `ContextRefresher` re-runs Spring Boot's own config-data pipeline, so profile-specific documents,
  `spring.config.import` chains, placeholder resolution and property-source precedence resolve
  exactly as at startup, and then re-binds every `@ConfigurationProperties` bean **in place** —
  Spring's own included. Nothing about this is scoped to `tafeladmin.*`.
- Nothing is `@RefreshScope`d and `spring.cloud.refresh.extra-refreshable` is unset, so a refresh
  destroys no beans.
- The frontend follows along: `ConfigChangePublisher` pushes the new `ConfigResponse` over
  `/api/sse/config`, and `ConfigApiService.observeConfig()` is a shared stream of the HTTP response
  plus that SSE feed. Components subscribe to it rather than reading config once.
- `tafeladmin.configReload.enabled: false` switches the mechanism off; it is read at startup only.

## Consequences

- An operator can flip a feature flag or change a mail recipient list on a live instance with no
  restart, no migration run and no dropped SSE stream.
- **What limits the effect is not the property's prefix but whether anything already consumed it.**
  A value baked into another bean at construction — `spring.datasource.url`, the Tomcat connector,
  the security filter chain, `tafeladmin.push.vapid*` — keeps what it was built with and still needs
  a restart. `tafeladmin.features.scannerFolderEnabled` changes because its consumers re-read it.
- Three authoring rules follow, and all three are easy to violate by accident:
  - `TafelAdminProperties` and its nested classes are **mutable JavaBeans with no-arg
    constructors**. A Kotlin primary constructor with parameters makes Spring deduce value-object
    binding, which silently turns rebinding into a no-op. They must not be "cleaned up" into data
    classes.
  - Consumers must read properties **per use**, not copy them into a field at construction.
  - `@Value` is **not** refreshed — it resolves once at bean construction. Reloadable settings use
    `@ConfigurationProperties`.
- `ApplicationProperties` (`security.*`) is intentionally *not* reloadable: it stays a
  constructor-bound data class so a missing JWT secret still fails startup loudly.
- Because no beans are destroyed, the Hikari pool and `SseOutboxListenerService`'s dedicated
  `LISTEN sse_outbox` connection survive a refresh untouched. `ConfigRefreshSideEffectsIT` locks that
  down — re-creating that listener would close the connection under its blocked reader and silently
  kill every open SSE stream ([#2985](https://github.com/wrk-tafel/admin/issues/2985)).
- Config is polled rather than watched via `WatchService`, because the file is a bind mount and
  filesystem events are unreliable across those. The trade is a small, constant amount of stat work.
- Reload widens what a config edit can do: a bad value now takes effect without the restart that
  would otherwise have surfaced it as a failed boot.

## Alternatives considered

**Restart the container for every config change.** The status quo it replaced. Rejected: too
expensive on this deployment (migrations, SSE, the Saturday window) for changes as small as a flag.

**Spring Cloud Config Server / bus-triggered refresh.** Rejected: it introduces a config service to
run and a bus to operate, when the actual trigger is "an operator edited a file on the host".

**Expose `/actuator/refresh` and have the operator POST to it.** Rejected: it is a second, manual
step that can be forgotten, and it makes a config change dependent on reaching a management endpoint.

**A hand-rolled YAML re-read.** Rejected: it would have to re-approximate profiles, imports,
placeholders and property-source precedence — all of which `ContextRefresher` gets right by reusing
Spring Boot's own pipeline.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/config/properties/ConfigFileReloadService.kt`
  (its KDoc is the fullest explanation)
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/config/README.md`
- `backend/src/test/.../ConfigRefreshSideEffectsIT.kt`
- `CLAUDE.md` — "Config Hot-Reload"
</content>
