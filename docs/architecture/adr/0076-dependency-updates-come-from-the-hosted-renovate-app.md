# ADR-0076: Dependency updates come from the hosted Renovate app

**Status:** accepted · **Recorded:** 2026-11-01

## Context

Dependabot's ecosystems cannot see an image named in a source file, so the images Testcontainers
starts only changed when somebody edited them by hand, and the floating `latest` tags of Mailpit and
pgAdmin changed without anybody seeing it. Renovate covers those through a custom manager and pinned
versions, and also reads the workflows' service containers and `docker-compose.yml`.

Renovate either runs as the hosted Mend GitHub App or as a self-hosted workflow. Earlier records
(ADR-0036, ADR-0043) name Dependabot where they describe what skips or misses an update; those
statements now apply to Renovate.

## Decision

Renovate runs as the **hosted GitHub App**, configured by `.github/renovate.json5`. Testcontainers
images are constants in `TestContainerImages.kt`, which the config's custom manager reads.

**Lockfiles stay with `.github/workflows/gradle_lockfile_update.yml`.** Renovate regenerates
`gradle.lockfile` and `verification-metadata.xml` only by running the Gradle wrapper, which
`allowedUnsafeExecutions` has to permit, and that is a setting of the Renovate instance, not of this
repository. `gitIgnoredAuthors` keeps the workflow's commits from counting as edits, which would stop
Renovate from updating the branch.

**Renovate is the only author of update pull requests.** It opens security updates too, from
GitHub's Dependabot alerts, which stay enabled. GitHub's Dependabot security updates are switched
off in the repository settings, so the two do not open the same pull request twice.

Renovate's pull requests go through `commitlint` and `pr-title-lint` like everybody else's. The
exemption existed for Dependabot's wording; Renovate's `chore(deps): update ...` is well-formed, and
the title is what `release.yml` derives the version from.

## Consequences

- No token or runner to maintain, but updates depend on a third-party service with write access to
  the repository, and runs happen on its timing rather than at a fixed time.
- The lockfile commit is pushed with `GITHUB_TOKEN` unless the `RENOVATE_LOCKFILE_PAT` secret is set,
  and a push with that token starts no CI run, so that commit stays unchecked without the secret.
- A floating tag now needs a pull request to move. A new Testcontainers image has to be added to
  `TestContainerImages.kt` in the shape the manager matches, or nothing updates it, and nothing
  fails if someone names an image in a test instead.
- The Postgres image moves as one group, but what production runs is decided in the infrastructure
  repository. A major update pull request has to be weighed against that.

## Alternatives considered

- **Self-hosted workflow.** It could allow `gradleWrapper` and drop the lockfile workflow, but needs a
  GitHub App or token of its own, plus a Renovate version to keep current, and it would run the
  wrapper with that token at hand, which is the supply-chain risk the option is off by default for.
- **Staying on Dependabot and updating images by hand.** That is the gap this closes.

## References

- [#3921](https://github.com/wrk-tafel/admin/issues/3921)
- `.github/renovate.json5`, `.github/workflows/gradle_lockfile_update.yml`,
  `backend/src/test/kotlin/at/wrk/tafel/admin/backend/TestContainerImages.kt`
