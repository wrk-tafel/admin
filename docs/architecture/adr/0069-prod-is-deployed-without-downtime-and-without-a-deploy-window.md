# ADR-0069: Prod is deployed without downtime, and without a deploy window

**Status:** accepted · **Recorded:** 2026-10-12

## Context

[ADR-0013](0013-saturday-production-deploy-freeze.md) blocked every production deploy on a Saturday,
because a deploy stopped the one container and started the new one: a cold start of 20 to 60 seconds
with the application gone, in front of a queue of people. It named the real fix itself - a second
instance to switch to - and set it aside because the application was not ready to run twice.

That has changed. The high-availability review
([#3188](https://github.com/wrk-tafel/admin/issues/3188)) and the work that followed it made two
instances against one database correct: mails are claimed row by row
([ADR-0045](0045-one-mail-per-transaction-taken-with-skip-locked.md)), scheduled jobs coordinate on
their rows or a lock ([ADR-0047](0047-scheduled-jobs-coordinated-by-rows-first-shedlock-second.md)),
static values are no longer cached per process
([ADR-0048](0048-static-values-resolved-from-a-per-run-snapshot.md)), sessions are stateless and
server push reaches every instance through the database
([ADR-0005](0005-server-sent-events-with-a-transactional-outbox.md)).

What the freeze cost was a whole day every week on which a fix for the distribution could not reach
the distribution, short of overriding it by hand with a second full pipeline run.

## Decision

**A prod deploy starts the new version next to the running one, switches to it once it is healthy,
and then stops the old one. No day or hour is closed to it.**

- The server holds two slots for the prod application. `deploy_admin.sh` (infrastructure
  repository) starts the new version in the free slot, waits for `/actuator/health` to report `UP`,
  rewrites the upstream nginx proxies `/verwaltung/` to and reloads nginx, then stops the old
  container. A version that never becomes healthy is removed, and prod keeps running the old one.
- The switch is one step for all traffic. The two versions never serve side by side, so a browser
  cannot load `index.html` from one and a lazy chunk from the other.
- The old instance is stopped gracefully: it answers the requests it has in progress and ends its
  event streams when the shutdown begins (`SseOutboxService.completeOpenStreams`), so their browsers
  reconnect to the new instance instead of holding the stop open.
- The new instance runs the Flyway migrations on boot, as before
  ([ADR-0004](0004-repeatable-only-flyway-migrations.md)) - while the old one still serves.
- `release.yml` loses its `check-deploy-window` job and the `overrideDeployFreeze` input;
  `deploy-prod` depends on the release alone.
- Dev and test keep the stop-then-start deploy. Nobody is standing at them.

## Consequences

- A release reaches prod whenever its pipeline does, Saturday included, and a deploy that fails
  leaves prod running instead of down.
- **For about half a minute per deploy two versions run against one database, the older one on a
  schema already migrated for the newer.** A migration the previous release cannot work with - a
  column it still reads dropped or renamed, a constraint it violates - breaks requests on the old
  version until the switch. This is accepted rather than ruled out: no expand/contract rule, and no
  check that holds such a release back. It is the thing to think about before releasing a
  destructive migration on a distribution day.
- The switch is not invisible. Event streams of the old instance end and reconnect, and a request
  still running after the 30 second shutdown timeout is cut.
- Two instances are alive together only during a deploy, and only one of them starts at a time. So
  the first-boot race in `InitialAdminUserService` (two instances booting against an empty `users`
  table) still cannot happen, and the connection budget is two pools of 20 plus two `LISTEN`
  connections against Postgres' 100.
- Prod and the other environments are no longer deployed the same way, so a pull request or a merge
  to `main` does not exercise the switch. Its first real run for a given change to the deploy script
  is on prod.
- ADR-0013's "one container per environment" no longer describes prod during a deploy; anything on
  the server that addresses the prod application by a fixed container name has to go through the
  slot in use.

## Alternatives considered

**Keep the freeze.** Rejected: it protected against an outage that the deploy no longer causes, at
the price of the one day a fix matters most.

**Keep the freeze only for releases that touch `db-migration/`.** Rejected in favour of no rule at
all: most migrations here are additive, a check on "a file changed" cannot tell those from a
destructive one, and a blocked release was the cost that prompted this decision.

**Expand/contract migrations as a standing rule.** Would close the mixed-schema window properly, by
splitting every destructive schema change across two releases. Rejected for now: a permanent cost
on every such change, against a window of half a minute.

**Two instances running permanently behind a load balancer (rolling deploys).** Rejected: it buys
resilience against a crashing instance, which was not the problem, and brings both versions serving
at once - the chunk skew and the mixed-schema window for the whole rollout instead of for the switch.

**Docker Swarm for the rollout.** Rejected: the host runs rootless Docker, which has no overlay
networks, and on a single node Swarm adds nothing a deploy script and an nginx reload do not.

## References

- `.github/workflows/release.yml` - `deploy-prod`
- [wrk-tafel/infrastructure#27](https://github.com/wrk-tafel/infrastructure/issues/27) - the two
  slots, `deploy_admin.sh`, the nginx upstream
- [#3815](https://github.com/wrk-tafel/admin/issues/3815), `GracefulShutdownIT` - the shutdown the
  switch relies on
- [#3816](https://github.com/wrk-tafel/admin/issues/3816), [#3193](https://github.com/wrk-tafel/admin/issues/3193)
- `CLAUDE.md` - "Prod Deploys Without Downtime"
