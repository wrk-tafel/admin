# ADR-0079: Renovate regenerates the dependency checksums after a Gradle update

**Status:** accepted · **Recorded:** 2026-11-22

Supersedes the checksum consequence of [ADR-0077](0077-renovate-updates-gradle-lockfiles-itself.md).

## Context

ADR-0077 lets Renovate run the Gradle wrapper, and accepted that Renovate only runs `dependencies`, so
a checksum for something only the build resolves goes missing and the pull request turns red. It
happened on most Gradle updates. The Spring Boot 4.2.0 update of 2026-11-22 lacked the checksum of
`jackson-base-3.1.8.pom`, a parent POM on the Spring Boot Gradle plugin's classpath.

Missing work was not the whole reason. Renovate processes every branch of a run in one container, so
the Gradle cache is warm from the branches before. Gradle neither verifies nor records an artifact it
takes from the cache. The same branch fails dependency verification with `--refresh-dependencies` and
passes without it. CI starts from an empty cache and fails.

## Decision

A post-upgrade task runs the command from CLAUDE.md's "Dependency Verification" on every branch that
updates a Gradle dependency or the wrapper (`postUpgradeTasks` in `.github/renovate.json5`):

```bash
./gradlew --write-verification-metadata sha256 --refresh-dependencies help
```

Only `gradle/verification-metadata.xml` is taken from it into the commit. `installTools` installs the
JDK of `constraints.java` for it. Renovate runs no command a repository asks for unless the instance
allows it: `allowedCommands` in `.github/renovate-global.json` of `wrk-infrastructure` lists exactly
this command.

## Consequences

- A Gradle update's pull request carries complete checksums, and CI checks them against an empty
  cache, as before.
- `--refresh-dependencies` downloads every dependency again on every Gradle branch, which makes
  Renovate's run longer.
- The command here and the one in `allowedCommands` have to stay identical. A change to one without
  the other makes Renovate skip the task, and the red pull requests come back.
- It runs the same updated build code as ADR-0077's lockfile step, next to the App's token. That risk
  is unchanged.
- Checksums are only added, never removed, as before.

## Alternatives considered

- **A workflow in this repository that regenerates the checksums on Renovate's pull requests.** This
  is ADR-0076's original setup, which ADR-0077 dropped: its commit starts no CI run without a separate
  token.
- **Keep fixing red pull requests by hand.** That is what ADR-0077 accepted, and it meant a manual
  commit on most Gradle updates.

## References

- `.github/renovate.json5`; `wrk-infrastructure`: `.github/renovate-global.json`
- [#3997](https://github.com/wrk-tafel/admin/pull/3997), consolidated in [#4000](https://github.com/wrk-tafel/admin/pull/4000)
- [Renovate: postUpgradeTasks](https://docs.renovatebot.com/configuration-options/#postupgradetasks)
