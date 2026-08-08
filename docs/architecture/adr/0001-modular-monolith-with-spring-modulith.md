# ADR-0001: Modular monolith with Spring Modulith

**Status:** accepted · **Recorded:** 2026-08-09

## Context

The application covers ten fairly independent problem areas — households, distributions, logistics,
check-in, dashboard, reporting, settings, support, push notifications and deployment config. They
share one database and one user session, and almost every screen combines data from two or three of
them (a distribution needs households, a daily report needs distribution *and* logistics numbers).

The operating reality shapes what is affordable: this is a volunteer-maintained system for a single
food bank, deployed as one container per environment on a small host, with a handful of concurrent
users and a hard weekly usage peak (see [ADR-0013](0013-saturday-production-deploy-freeze.md)).
Nobody is on call. At the same time, "one Spring Boot app with packages" had already shown its
failure mode: any service could inject any other service, so the dependency graph drifted in
whichever direction was convenient that day.

## Decision

The backend is a **single deployable** whose internal boundaries are declared and machine-checked
with **Spring Modulith**.

Every feature module under `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/<module>/`
carries a `package-info.java` that states exactly which other modules it may reach into:

```java
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"base::country", "base::exception"}
)
package at.wrk.tafel.admin.backend.modules.household;
```

A module's root package is its public API; everything under `internal/` is invisible to other
modules. Where only part of a module should be shared, it is exposed as a `@NamedInterface`
submodule (`base::country`, `base::employee`, `base::exception`).

Boundaries are enforced **at build time only**, by `ModularityTest.verifiesModularStructure()`,
which bootstraps `ApplicationModules.of("at.wrk.tafel.admin.backend.modules")` and calls `verify()`.
Nothing in the running application checks or depends on module metadata.

Where a dependency would be the wrong direction, it is inverted with a Spring application event
rather than an interface: `distribution` publishes `DistributionClosedEvent`, and `reporting`
(which owns the PDFs and CSVs) is the module declaring the dependency, purely to reference the event
type.

## Consequences

- Each module can be understood, tested and reviewed on its own, and an accidental cross-module
  import fails the build rather than being discovered a year later.
- There is exactly one process, one datasource, one transaction manager and one deployment to
  operate — a change spanning three modules is still one commit, one build and one release.
- The boundary governs `modules.*` traffic **only**. `database/model/*` is deliberately a shared
  lower layer: any module may inject any entity or repository from it without declaring anything.
  This is a real, accepted hole — `household` reaches `EmployeeEntity` through `UserEntity.employee`
  while `logistics` goes through `base::employee`'s service — and it means a module's
  `allowedDependencies` list is *not* the full list of what it touches. The one hard rule left is
  direction, enforced by an ArchUnit rule (`ProjectSpecificRulesTest`: database entities must not
  depend on feature modules).
- Inverting a dependency with an event trades a compile-time call for a runtime one. The listener
  side has to decide sync vs. async explicitly, and getting that wrong is invisible until it
  misbehaves — `reporting` uses a plain synchronous `@EventListener` specifically so a manual mail
  re-send cannot report success before the send was attempted.
- IntelliJ's Spring Modulith inspection bootstraps from the `@SpringBootApplication` package, one
  level above `modules`, and therefore reports spurious warnings. `ModularityTest` is the source of
  truth (see [#2892](https://github.com/wrk-tafel/admin/issues/2892)).

## Alternatives considered

**Microservices, one per feature area.** Rejected: every operational cost (deployment, tracing,
schema-per-service, cross-service transactions for "close the distribution and email the report")
would be paid permanently by a volunteer team, to solve scaling and independent-release problems
this system does not have.

**Plain layered monolith, boundaries by convention.** Rejected: this is what the code grew out of.
Conventions that nothing verifies survive exactly as long as the person who remembers them.

**Boundaries enforced at runtime** (module metadata bootstrapped by the running app). Rejected: it
buys nothing a build-time test does not already give, while adding startup work and a failure mode
in production for a structural mistake that CI has already had the chance to catch.

## References

- `backend/src/test/kotlin/at/wrk/tafel/admin/backend/architecture/ModularityTest.kt`
- `backend/src/test/kotlin/at/wrk/tafel/admin/backend/architecture/ProjectSpecificRulesTest.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/*/package-info.java`
- Module READMEs, especially `modules/distribution/README.md` ("Why `distribution` no longer depends
  on `reporting`") and `modules/base/README.md`
- [#2892](https://github.com/wrk-tafel/admin/issues/2892) — IDE inspection vs. `ModularityTest`
</content>
