# ADR-0031: SonarCloud quality gate over JaCoCo coverage, with an explicit opt-out annotation

**Status:** accepted · **Recorded:** 2026-08-09

## Context

Code quality on a volunteer project degrades quietly. Nobody decides to lower the standard; it slips
one unreviewed pull request at a time, and by the time it is visible it is expensive to reverse.

Coverage is the usual proxy, and it has a well-known distortion: a large part of a Spring/Kotlin
codebase is boilerplate with no behaviour to test — DTO property accessors, plain enums, field-only
JPA entities, `@Configuration` bean wiring. Counting those as "untested" pushes the number down for
reasons that say nothing about risk, and the predictable reaction is to write tests that assert
nothing in order to move a metric.

## Decision

**Every pipeline run analyses the code with SonarCloud, fed by a JaCoCo coverage report, and code
with genuinely no behaviour is excluded explicitly at the source.**

- JaCoCo runs as part of `:backend:test` (`finalizedBy(jacocoTestReport)`), producing XML and HTML.
- The `sonar` job uploads it to SonarCloud, which owns the quality gate.
- `@ExcludeFromTestCoverage` (a typealias for `NoCoverageGenerated`, named that way so JaCoCo
  recognises it) marks logic-free code: data classes, plain enums, field-only entities, thin
  exceptions, `@Configuration` wiring.
- Its KDoc records what it actually still does, verified empirically against this repo's own build:
  JaCoCo already filters Kotlin-generated `equals`/`hashCode`/`toString`/`copy`/`componentN` on its
  own via `@kotlin.Metadata`, so the annotation is **not** what protects those. What JaCoCo does not
  filter is plain property getters/setters, which show as missed whenever a DTO's properties are only
  exercised through a generated `equals()`. That is the annotation's remaining job.
- Sonar findings are treated as things to fix rather than to waive: several decisions elsewhere in
  this repo exist because Sonar flagged them (`npm ci` from a lockfile instead of on-demand installs,
  log sanitisation on request-derived values).
- Tests run with the same locale and timezone as production
  ([ADR-0027](0027-single-locale-and-timezone.md)), so formatting-sensitive assertions behave in CI
  the way they do locally.

## Consequences

- Quality has a number attached that moves visibly, and a gate that blocks rather than a report
  nobody opens.
- The coverage figure means something, because it is not diluted by accessors that cannot fail.
- **The opt-out is a judgement call and can be abused.** Annotating a class that contains real logic
  hides exactly what should be measured. Its KDoc is explicit that it is for logic-free code only —
  and being an annotation in the source, its use is visible in review, which a Sonar exclusion
  pattern in a config file would not be.
- The set of what JaCoCo filters natively changes between versions, so the annotation's stated
  purpose is a claim with a date on it — hence the recorded empirical re-verification rather than
  received wisdom ([#3010](https://github.com/wrk-tafel/admin/issues/3010)).
- The gate depends on an external service. A SonarCloud outage or an org/token change blocks the
  signal, and the analysis needs a token that must be maintained.
- Coverage percentage remains a proxy. It shows what was *executed*, never what was *asserted*, and
  nothing here changes that — ArchUnit rules
  ([ADR-0030](0030-conventions-enforced-by-archunit.md)) and real integration tests
  ([ADR-0014](0014-integration-tests-against-real-postgres.md)) carry the weight the number cannot.

## Alternatives considered

**No coverage gate, review only.** Rejected: it is the arrangement in which quality slips silently.

**A hard coverage threshold enforced in Gradle.** Rejected: a single global number is either so low
it means nothing or so high it forces assertion-free tests, and it gives none of Sonar's other
analysis.

**Exclusion patterns in Sonar configuration instead of an annotation.** Rejected: an exclusion buried
in configuration is invisible during review, and it excludes by path rather than by whether the class
actually has behaviour.

**Self-hosted SonarQube.** Rejected — one more service to run, for the same reason as every other
component ([ADR-0003](0003-postgresql-as-the-only-infrastructure-dependency.md)).

## References

- `backend/build.gradle.kts` — the `jacoco` and `sonar` blocks
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/ExcludeFromTestcoverage.kt`
- `.github/workflows/subflow_sonar.yml`
- [#3010](https://github.com/wrk-tafel/admin/issues/3010)
</content>
