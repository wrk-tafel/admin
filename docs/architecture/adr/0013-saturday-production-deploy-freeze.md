# ADR-0013: Production deploys are blocked all day Saturday

**Status:** accepted · **Recorded:** 2026-08-09

## Context

The food distribution runs on Saturdays, roughly 12:00–24:00 Vienna time. During that window the
application is not "in use" in the ordinary web-app sense — it is the tool people are standing at:
check-in scanners, the ticket screen in front of the queue, household lookups at the desk.

A production deploy restarts the container. That restart runs Flyway migrations on boot
([ADR-0004](0004-repeatable-only-flyway-migrations.md)), drops every open SSE stream
([ADR-0005](0005-server-sent-events-with-a-transactional-outbox.md)), and takes the app away for the
duration of a cold start. Doing that mid-distribution is a visible outage with a room full of people
waiting.

There is no blue/green setup and no second instance to fail over to — one container per environment
([ADR-0002](0002-single-deployable-image-with-independent-builds.md)).

## Decision

**The `deploy-prod` job refuses to run for the entire Saturday, Europe/Vienna time, and it fails the
release run rather than skipping quietly.**

`release.yml`'s `check-deploy-window` job checks the ISO weekday with `TZ=Europe/Vienna` and exits
non-zero on Saturday, writing an explanatory line to the job summary and an `::error` annotation.
`deploy-prod` depends on it.

Everything up to and including `deploy-test` still succeeds. Prod is deployed by re-running the
failed jobs once it is no longer Saturday.

## Consequences

- The failure mode this exists to prevent — a restart under live load — cannot happen by accident,
  including from an automated or half-attended release.
- **A red release run whose only failure is `check-deploy-window` means the freeze, not a broken
  build.** Anyone triaging CI needs to know that; it is the deliberate cost of failing loudly.
- Failing was chosen over skipping precisely because a skipped job looks like a successful release
  that silently did not deploy — the worst of both outcomes.
- The whole day is blocked, not just 12:00–24:00. Preparation happens before the distribution
  starts, the exact window varies, and a coarse rule needs no maintenance and cannot be
  mis-evaluated near a boundary.
- An urgent Saturday hotfix has to override the check deliberately (or wait until Sunday). That is
  the intended trade: the freeze protects the hours when a mistake is most expensive, and overriding
  it is a conscious act rather than an accident.
- The rule is time-based, not load-based. It knows nothing about whether a distribution is actually
  running, which is what keeps it simple and predictable.

## Alternatives considered

**Block only 12:00–24:00.** Rejected: the window shifts, setup work starts earlier, and a boundary
check invites a deploy that lands at 11:58 and is still restarting at 12:01.

**Skip the job instead of failing it.** Rejected: a green run that did not deploy is
indistinguishable from a green run that did, until someone notices prod is on the old version.

**Rely on the team not deploying on Saturdays.** Rejected: this is exactly the kind of rule that
holds until the one time it matters.

**Zero-downtime deploys (rolling instances, blue/green).** The real fix, and out of scope for this
deployment: it needs a second instance, a load balancer, and migrations that are compatible across
two versions running at once — all of which conflict with the single-container,
migrate-on-boot model. Revisit this ADR if that model changes.

## References

- `.github/workflows/release.yml` — the `check-deploy-window` job
- [#2931](https://github.com/wrk-tafel/admin/issues/2931)
- `CLAUDE.md` — "Saturday Deploy Freeze"
</content>
