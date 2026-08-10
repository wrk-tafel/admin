# ADR-0019: Pinned supply chain and a container that fails loudly

**Status:** accepted · **Recorded:** 2026-08-09

## Context

The application runs unattended on a small host, deployed from a public CI pipeline that pulls
hundreds of transitive dependencies and a dozen third-party GitHub Actions. Two risks follow from
that, and neither is theoretical for a project handling personal data:

1. **Supply chain.** A build that resolves "whatever the registry serves today" can be handed
   something different from what was reviewed — a compromised release, a tag moved under a mutable
   reference, an install-time script.
2. **Silent degradation.** Nobody is on call. A process that stays up in a broken state — out of
   memory, wedged, half-initialised — serves errors until a human notices, which on this deployment
   could be days.

Startup time matters for a related reason: a restart is expensive here because migrations run on
boot, so the shorter it is, the smaller the window it occupies.

## Decision

**Everything that enters the build is pinned and verified, and the running container is built to
fail visibly rather than linger.**

Supply chain:

- **Gradle dependency verification** via `gradle/verification-metadata.xml` — SHA-256 checksums for
  every resolved artifact. Regenerating it requires `--refresh-dependencies`, otherwise Gradle reuses
  cached artifacts and silently omits new checksums (`.module` files especially), which then fails in
  CI where everything downloads fresh.
- **GitHub Actions pinned to commit SHAs**, not tags — a tag can be moved, a SHA cannot.
- **`npm ci --ignore-scripts`** in CI, installing from a committed lockfile rather than resolving on
  demand. `--ignore-scripts` blocks lifecycle scripts from any transitive dependency.
- Dependency updates arrive as reviewable Dependabot PRs that run the full pipeline.

Container runtime:

- **`-XX:+ExitOnOutOfMemoryError`** — an OOM kills the process so the container's restart policy
  recovers it, instead of leaving a wedged app serving errors.
- **`-XX:MaxRAMPercentage=75.0`** — the JVM's default 25% cap is meant for large hosts and would
  leave most of this container's memory unused.
- A **HEALTHCHECK against the management port (8081)**, which stays reachable even if the main
  servlet container is wedged. Its timings are derived from measured cold starts of this image.
- An **AppCDS archive** trained during the image build by starting the app for real against a
  throwaway local Postgres, then baked in — roughly 20–25% faster starts with no behaviour change.
- Locale and timezone are fixed in the entrypoint ([ADR-0027](0027-single-locale-and-timezone.md)).

## Consequences

- A build either resolves exactly the reviewed artifacts or fails. That is the point, and it is also
  the main friction: **adding or bumping a dependency requires regenerating the verification
  metadata**, and forgetting to pass `--refresh-dependencies` produces a failure that reproduces only
  in CI.
- Pinned action SHAs mean upgrades are explicit commits rather than something that happens silently
  between two runs — at the cost of a version comment next to every `uses:` line to stay readable.
- An OOM is now a restart and a gap in the logs rather than an application that answers slowly and
  wrongly. On a system with no on-call, a loud crash-and-restart is the better failure mode.
- The healthcheck can report healthy while a *dependency* is down, since it probes the management
  endpoint rather than a full request path. That is deliberate — it is a liveness signal, not an
  end-to-end check.
- The CDS training stage makes the image build heavier: it installs PostgreSQL and boots the whole
  application once. It also has a sharp constraint — **the trainer must launch the app exactly the
  way the final entrypoint does** (`JarLauncher` over the extracted layered jar), because CDS is
  classpath-layout sensitive and a mismatch silently produces an archive that is never used.
- None of this protects against a dependency that is malicious *and* correctly checksummed. It
  removes tampering-in-transit and moving-tag classes of problem, not vetting.

## Alternatives considered

**Version ranges / floating tags for speed of updates.** Rejected: it makes the build
non-reproducible and moves the review point from "a PR" to "whenever the registry changed".

**Restart the app on OOM from inside the JVM, or just let it run.** Rejected: a JVM that has hit OOM
is not in a state to be trusted with recovery, and letting it run is the silent-degradation failure
this decision exists to prevent.

**Skip AppCDS and accept slower starts.** Reasonable, and rejected because restart cost is directly
in tension with the deploy window ([ADR-0013](0013-saturday-production-deploy-freeze.md)) — 20–25%
off a cold start is worth one build-time stage.

**A native image (GraalVM) for fast startup.** Rejected: reflection/proxy configuration for Spring,
JPA, Jackson XML and FOP would be an ongoing maintenance burden far larger than the CDS stage.

## References

- `gradle/verification-metadata.xml`, `README.md` — "Dependency Verification"
- `_build/Dockerfile` — CDS trainer, entrypoint flags, healthcheck
- `.github/workflows/` — SHA-pinned actions, `npm ci --ignore-scripts`
- [#2879](https://github.com/wrk-tafel/admin/issues/2879),
  [#2881](https://github.com/wrk-tafel/admin/issues/2881),
  [#2935](https://github.com/wrk-tafel/admin/issues/2935)
</content>
