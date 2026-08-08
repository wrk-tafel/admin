# ADR-0015: Kotlin/Spring Boot on the backend, Angular on the frontend

**Status:** accepted · **Recorded:** 2026-08-09

## Context

This is the most foundational choice in the repository and the one every other ADR is written on top
of: which platform the application is built with at all.

The constraints that matter are not technical peaks. The system is maintained by a small,
changing group of volunteers around a food bank; it must stay maintainable by whoever is available
next year, not only by whoever wrote it. It is a forms-and-workflow application over a relational
database, with modest load and a hard requirement to keep working. Hiring is not a lever — the pool
is whoever turns up — so "a technology people already know, with documentation and answers freely
available" outweighs elegance.

## Decision

**The backend is Kotlin on Spring Boot, running on a current Amazon Corretto JDK. The frontend is
Angular with Angular Material and Tailwind CSS.** Both are kept close to current versions rather
than pinned to an old known-good release.

- Kotlin over Java for the same JVM ecosystem with null-safety in the type system, data classes and
  far less ceremony — while every Spring, Jackson, Hibernate and Apache library remains directly
  usable.
- Spring Boot because everything this application needs — transactions, JPA, security, scheduling,
  mail, validation, actuator, SSE — is one framework's well-documented surface rather than a set of
  integrations to assemble and maintain.
- Spring Modulith on top of it for structure ([ADR-0001](0001-modular-monolith-with-spring-modulith.md)).
- Angular because the frontend is exactly what it is good at: many routed forms, reactive validation,
  a component library (Material) covering tables, dialogs and date pickers out of the box, and an
  opinionated structure that survives contributor turnover.
- Both sides track the current generation of their framework ([ADR-0010](0010-zoneless-standalone-angular-with-signals.md)),
  and exact versions live in `gradle/libs.versions.toml` and `package.json` rather than being
  duplicated into prose.

## Consequences

- One language family per side, one idiom per side, and a very large amount of the application's
  behaviour is framework-provided and therefore not this project's to maintain.
- Kotlin's null-safety removes a class of bug outright, and it interoperates with Java libraries
  with no bridge code.
- **The JVM's startup and memory profile is a real cost** on a small host: the image bakes an AppCDS
  archive purely to claw back startup time ([ADR-0019](0019-supply-chain-and-container-runtime-hardening.md)),
  and a cold start is measured in seconds, not milliseconds. That cost is what
  [ADR-0013](0013-saturday-production-deploy-freeze.md) exists to keep out of the distribution
  window.
- Some framework behaviour must be understood rather than assumed — JPA cascades and
  `orphanRemoval` on the household graph, `@Transactional` proxying and self-invocation, Spring
  event listener sync/async semantics. Several of the sharpest gotchas in the module READMEs are of
  exactly this kind.
- Staying current means a steady stream of upgrade work (Dependabot PRs, framework migrations). The
  alternative — pinning and deferring — converts that into one large, risky jump later, which for a
  volunteer team is worse.
- Both ecosystems are mainstream, so a new contributor's existing knowledge transfers and the answer
  to most questions is already written down somewhere public.

## Alternatives considered

**Java instead of Kotlin.** The lower-common-denominator choice, and a defensible one. Rejected
because Kotlin is a superset of the same ecosystem in practice: nothing is lost, null-safety and
conciseness are gained, and a Java developer reads Kotlin with very little ramp-up.

**A lighter JVM framework (Quarkus, Micronaut, Ktor) or a non-JVM stack (Node, .NET, Go).** Rejected:
they would trade Spring's breadth and documentation depth for startup time and memory — the two
things this deployment can most afford to spend.

**React or Vue instead of Angular.** Rejected: both would need the surrounding decisions (routing,
forms, HTTP, component library, structure) assembled and then kept consistent by convention. Angular
ships those as one opinionated whole, which is worth more here than flexibility.

**Server-rendered templates (Thymeleaf) with no SPA.** Rejected: the live screens — ticket display,
check-in, dashboard — are inherently client-side and stream state
([ADR-0005](0005-server-sent-events-with-a-transactional-outbox.md)). Thymeleaf is still used, but
for mail templates.

## References

- `README.md` — the tech-stack tables with current versions
- `gradle/libs.versions.toml`, `backend/build.gradle.kts`
- `frontend/src/main/webapp/package.json`
</content>
