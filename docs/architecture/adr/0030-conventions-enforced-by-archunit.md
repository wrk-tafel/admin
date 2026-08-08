# ADR-0030: Structural conventions are enforced by ArchUnit tests, not by review

**Status:** accepted · **Recorded:** 2026-08-09

## Context

This repository runs on a long list of structural conventions: module boundaries
([ADR-0001](0001-modular-monolith-with-spring-modulith.md)), DTO suffixes
([ADR-0008](0008-rest-api-and-dto-naming-conventions.md)), the `*Test`/`*IT` split
([ADR-0014](0014-integration-tests-against-real-postgres.md)), controllers under `/api` so the
security filter chain covers them ([ADR-0006](0006-stateless-jwt-cookie-authentication.md)).

Conventions that only exist in a document are enforced by whoever reviews the pull request, if they
remember, if they notice. On a project with rotating volunteer contributors that is not a
mechanism — it is a hope. And some of these are not style questions: a controller mapped outside
`/api` is *unauthenticated*, and a `println` in production code is a log line nobody will ever see.

## Decision

**The conventions that can be expressed as a rule about code structure are ArchUnit tests, so
violating one fails the build.**

Four test classes under `backend/src/test/kotlin/.../architecture/`:

- **`ModularityTest`** — Spring Modulith's `verify()` over the module tree; the source of truth for
  module boundaries.
- **`ProjectSpecificRulesTest`** — the rules that are specific to this system: REST controllers must
  be mapped under `/api` so the security filter chain covers them; controllers must not depend on
  database entities directly; **database entities must not depend on feature modules** (the one hard
  direction rule of the shared entity layer).
- **`NamingConventionsTest`** — unit test classes and integration test classes are named properly,
  which is what makes the `*Test`/`*IT` distinction real rather than customary.
- **`GeneralCodingRulesTest`** — no `stdout`/`stderr`, no field injection, no generic exceptions
  thrown, no Joda-Time, no `java.util.logging`.

A rule that cannot be expressed structurally stays prose in `CLAUDE.md` and the module READMEs; the
two are complementary, not alternatives.

## Consequences

- A violation is caught by the same run that catches a failing unit test, on the contributor's
  machine and in CI, with a message naming the offending class — instead of in a review comment, or
  never.
- Review attention goes to whether the code is *right* rather than whether it is *shaped correctly*.
- The rules are executable documentation: reading `ProjectSpecificRulesTest` tells you what the
  layering actually is, and it cannot go stale the way a paragraph can.
- **A rule is only as good as its expressibility.** "Controllers must be under `/api`" is checkable;
  "a module should not reach into another module's concerns conceptually" is not. Encoding the first
  can create false confidence about the second.
- New rules cost thought: an over-tight rule blocks legitimate code and gets suppressed, which is
  worse than not having it. The current set is deliberately small.
- Rules use ArchUnit's Kotlin-friendly backtick naming, so a failure reads as a sentence.
- These tests run in the ordinary `:backend:test` task, so they are not something a contributor has
  to know to run separately.

## Alternatives considered

**Document the conventions and rely on review.** The status quo everywhere they are not encoded, and
rejected for the ones that matter: it depends on a reviewer's memory, and the security-relevant rules
deserve better than that.

**Detekt/ktlint rules for everything.** ktlint *is* used, for formatting. Rejected as the mechanism
here: these are rules about relationships between types and packages, which a formatter and a
line-based linter cannot see.

**A custom compiler plugin or annotation processor.** Rejected: far more machinery, and it would run
at every compile rather than in the test phase where a clear failure message is cheap.

**Rely on Sonar rules.** Complementary rather than alternative
([ADR-0031](0031-sonarcloud-quality-gate-with-explicit-coverage-opt-out.md)): Sonar catches generic
code smells, not this project's own layering.

## References

- `backend/src/test/kotlin/at/wrk/tafel/admin/backend/architecture/`
- `CLAUDE.md` — "Code Conventions", "Architecture"
</content>
