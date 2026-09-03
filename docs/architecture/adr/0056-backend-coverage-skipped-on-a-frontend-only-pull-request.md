# ADR-0056: The backend suite, and the coverage it feeds, are skipped on a pull request that cannot touch the backend

**Status:** accepted · **Recorded:** 2026-09-03

Narrows [ADR-0031](0031-sonarcloud-quality-gate-with-explicit-coverage-opt-out.md), which is
otherwise unchanged.

## Context

[ADR-0031](0031-sonarcloud-quality-gate-with-explicit-coverage-opt-out.md) decided that **every**
pipeline run analyses the code with SonarCloud, fed by a JaCoCo report produced by `:backend:test`.
`subflow_test.yml` implements that by being the one job in the path-aware pipeline that is *not*
gated on its own area: it runs for any application change, frontend-only included, because "an
analysis without it reports the whole backend as uncovered".

At ~414 seconds it is the pipeline's longest single job, and it gates `sonar` behind it. A pull
request that only edits Angular templates pays seven minutes to re-run a Kotlin test suite against
byte-identical sources, so that a coverage report can be attached to files whose coverage did not
move.

Two facts decide whether that is actually needed:

- **SonarCloud's pull-request analyses measure new code.** The issues and coverage a pull request is
  judged on are those of the lines it adds or changes. A pull request that touches no backend file
  adds no backend line whose coverage could be missing.
- **The quality gate does not block this pipeline anyway.** `sonar.qualitygate.wait` is `false` in
  the root `build.gradle.kts`, so the `sonar` job reports and never fails on the gate's verdict. A
  distorted measure here cannot turn a run red; it can only mislead a reader.

## Decision

**`subflow_test.yml` takes a `backend` input, and `pull_request.yml` passes it the change
classification. The push pipelines pass nothing and keep the old behaviour.**

- `test-backend` — and with it the JaCoCo report — is skipped only on a pull request whose diff
  reaches neither `backend/` nor the Gradle build files, as classified by `subflow_changes.yml`.
- `main_push.yml` and `release.yml` always run it. The coverage stored against the `main` branch
  therefore always comes from a real run, never from a skipped one.
- `subflow_sonar.yml`'s download of the report is `continue-on-error`, so the analysis still runs and
  still reports on the frontend code that did change.
- Nothing about the gate, the `@ExcludeFromTestCoverage` opt-out, or what is measured changes. This
  record changes *when the report is produced* and nothing else.

## Consequences

- **A frontend-only pull request is ~414 seconds shorter**, and `sonar` no longer waits on a suite
  that cannot tell it anything new.
- **The overall coverage percentage shown on such a pull request is wrong**, and this is the real
  cost. SonarCloud reports overall measures next to the new-code ones, and without the report the
  overall figure for that analysis reads as though the backend were untested. The new-code numbers —
  the ones the gate is defined on — stay correct. Anyone reading a frontend-only pull request's
  Sonar decoration has to know this, which is why it is written down here rather than left as a
  surprise.
- **A Dockerfile-only pull request also skips it**, since that change classifies as neither backend
  nor frontend. That is consistent with the rule as stated — the diff cannot touch backend
  behaviour — but it is a case worth knowing about, because such a pull request gets an analysis
  with no coverage of either half.
- **The saving does not apply to `main`.** A frontend-only merge still pays the full suite, by
  design: that run is what keeps the branch's stored coverage honest.
- If SonarCloud ever moves to gating on overall coverage rather than new-code coverage, this record
  has to be revisited before that switch, not after.

## Alternatives considered

**Reuse the JaCoCo report from the last successful `main` run.** The most accurate option: on a
frontend-only pull request the backend sources are identical to `main`, so `main`'s coverage of them
is exactly right, and the overall figure would stay truthful. Rejected on fragility — the artifact is
uploaded with `retention-days: 1`, so any pull request opened against a `main` older than a day would
find nothing and need this same fallback anyway, and fetching an artifact across workflow runs means
either a third-party action or hand-rolled `gh` plumbing. Worth reconsidering if the overall-measure
distortion above turns out to bother anyone in practice.

**Skip the `sonar` job entirely for frontend-only pull requests.** Simpler, and it removes the
distorted measure by removing the measurement. Rejected: it also removes the analysis of the frontend
code the pull request actually changed, which is the half that most wants reviewing.

**Run the backend suite without JaCoCo when the backend is untouched.** Saves only the
instrumentation, not the seven minutes, which is the entire point.

**Leave it as it was.** Defensible — the cost is CI time, not correctness. Rejected because seven
minutes on every frontend pull request is the single largest avoidable wait in the pipeline once the
Lighthouse jobs moved off it ([ADR-0055](0055-lighthouse-runs-after-the-merge-not-on-every-pull-request.md)).

## References

- `.github/workflows/subflow_test.yml` — the `backend` input and the gated job
- `.github/workflows/pull_request.yml` — the only caller that passes it
- `.github/workflows/subflow_sonar.yml` — the tolerated missing artifact
- `build.gradle.kts` — `sonar.qualitygate.wait: false`
- [ADR-0031](0031-sonarcloud-quality-gate-with-explicit-coverage-opt-out.md) — what the gate is and why
