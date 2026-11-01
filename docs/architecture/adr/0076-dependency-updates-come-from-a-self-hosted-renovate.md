# ADR-0076: Dependency updates come from a self-hosted Renovate

**Status:** accepted; lockfile part superseded by [ADR-0077](0077-renovate-updates-gradle-lockfiles-itself.md) · **Recorded:** 2026-11-01

## Context

Dependabot's ecosystems cannot see an image named in a source file, so the images Testcontainers
starts only changed when somebody edited them by hand, and the floating `latest` tags of Mailpit and
pgAdmin changed without anybody seeing it. Renovate covers those through a custom manager and pinned
versions, and also reads the workflows' service containers and `docker-compose.yml`.

The same Renovate has to serve the private `wrk-infrastructure` repository. That repository cannot
have branch protection on its plan, and its Actions secrets include the SSH keys and the vault
password for the production VM, so write access to it is close to access to the VM. Earlier records
(ADR-0036, ADR-0043) name Dependabot where they describe what skips or misses an update; those
statements now apply to Renovate.

## Decision

Renovate runs **self-hosted, as a scheduled workflow in `wrk-infrastructure`**
(`.github/workflows/renovate.yml` there), authenticated as our own GitHub App `wrk-tafel-renovate`,
which is installed on these two repositories only. It runs in the private repository because
Renovate's logs name dependencies of every repository it processes, and `admin`'s logs are public.

This repository's behaviour is configured by `.github/renovate.json5`. Testcontainers images are
constants in `TestContainerImages.kt`, which the config's custom manager reads.

**Lockfiles stay with `.github/workflows/gradle_lockfile_update.yml`.** Renovate regenerates
`gradle.lockfile` and `verification-metadata.xml` only by running the Gradle wrapper, which
`allowedUnsafeExecutions` would have to permit. It stays off: that would run this repository's build
inside the job holding the token for both repositories. `gitIgnoredAuthors` keeps the workflow's
commits from counting as edits, which would stop Renovate from updating the branch.

**Renovate is the only author of update pull requests.** It opens security updates too, from
GitHub's Dependabot alerts, which stay enabled. GitHub's Dependabot security updates are switched
off, so the two do not open the same pull request twice.

Renovate's pull requests go through `commitlint` and `pr-title-lint` like everybody else's. The
exemption existed for Dependabot's wording; Renovate's `chore(deps): update ...` is well-formed, and
the title is what `release.yml` derives the version from.

A Postgres major waits for approval on the dependency dashboard: production's major is a data
directory upgrade decided in the infrastructure repository, and tests should not move ahead of it.

## Consequences

- No third party holds write access to either repository, but we hold the App's private key, keep the
  pinned Renovate version current, and notice ourselves when the scheduled run fails.
- The daily run spends the private repository's 2000 included Actions minutes, however little it does
  for `admin`.
- Unlike Dependabot's, Renovate's pull requests receive Actions secrets and a token with the
  repository's default permissions. Secrets stay safe only as long as jobs that run updated code do
  not get them, which is a rule to keep in mind when adding a step to a pull request workflow.
- The bot's name is written into the workflow guards here (`wrk-tafel-renovate[bot]`). Renaming the
  App breaks them silently.
- The lockfile commit is pushed with `GITHUB_TOKEN` unless the `RENOVATE_LOCKFILE_PAT` secret is set,
  and a push with that token starts no CI run, so that commit stays unchecked without the secret.
- A floating tag now needs a pull request to move. A new Testcontainers image has to be added to
  `TestContainerImages.kt` in the shape the manager matches, or nothing updates it, and nothing
  fails if someone names an image in a test instead.

## Alternatives considered

- **The hosted Mend app.** Free for private repositories too and nothing to maintain, but it means a
  third party holding write access to a repository with no branch protection, whose workflows hold
  the production VM's credentials, plus a clone of its inventory and configuration on their systems.
- **Hosted for `admin`, self-hosted for `wrk-infrastructure`.** Limits the exposure just the same,
  but leaves two setups to understand for two repositories.
- **Running the workflow in `admin`.** Actions minutes would be free, but its logs are public.
- **Staying on Dependabot and updating images by hand.** That is the gap this closes.

## References

- [#3921](https://github.com/wrk-tafel/admin/issues/3921)
- `.github/renovate.json5`, `.github/workflows/gradle_lockfile_update.yml`,
  `backend/src/test/kotlin/at/wrk/tafel/admin/backend/TestContainerImages.kt`
