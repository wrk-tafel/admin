# ADR-0077: Renovate updates the Gradle lockfiles itself

**Status:** accepted · **Recorded:** 2026-11-02

Supersedes the lockfile part of [ADR-0076](0076-dependency-updates-come-from-a-self-hosted-renovate.md).

## Context

ADR-0076 kept a separate workflow for `gradle.lockfile` and `verification-metadata.xml`, so that
Renovate's job would not run this repository's build. On Renovate's first run that workflow proved
awkward: it had to list every path a Gradle update can touch and missed the jacoco tool version, and
its commit started no CI run unless a separate token was configured. So the commit that fixes an
update pull request stayed unchecked.

## Decision

Renovate runs the Gradle wrapper: `allowedUnsafeExecutions` in `.github/renovate-global.json` of
`wrk-infrastructure` includes `gradleWrapper`. `constraints.java` in `.github/renovate.json5` tells it
which JDK to install, because the build's toolchain requires that version and nothing provisions one.

## Consequences

- Lockfile and checksum changes are part of Renovate's own commit, so CI checks them.
- Updated build code, Gradle plugins included, now runs in the job that holds the App's token, which
  has write access to this repository and to `wrk-infrastructure`. Renovate does not hand the token to
  the commands it runs, but that is no boundary against code running on the same machine. A
  compromised plugin could reach both repositories, and through `wrk-infrastructure`'s workflows the
  production VM's credentials. This risk is accepted in exchange for the simpler setup.
- Renovate only runs `dependencies`, which is less than the build resolves. A checksum for something
  only the build itself resolves goes missing and shows up as a red pull request, to be fixed with the
  command in CLAUDE.md's "Dependency Verification".
- `constraints.java` has to follow the toolchain version in `backend/build.gradle.kts`.

## Alternatives considered

- **Keeping the workflow with a token of its own.** Keeps updated build code away from the App's
  token, at the cost of the workflow and one more secret.

## References

- [#3921](https://github.com/wrk-tafel/admin/issues/3921)
- `.github/renovate.json5`, `backend/build.gradle.kts`
