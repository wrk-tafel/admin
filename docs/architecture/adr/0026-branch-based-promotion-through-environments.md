# ADR-0026: Branch-based promotion through dev, test and prod

**Status:** superseded by [ADR-0042](0042-deployments-through-github-environments.md) · **Recorded:** 2026-08-09

## Context

There are three environments and one artefact type ([ADR-0002](0002-single-deployable-image-with-independent-builds.md)).
Somebody has to decide what runs where, and the decision has to be automatic enough that a volunteer
team is not doing manual deploys, while still keeping production from receiving anything unreviewed.

The environments serve different purposes: dev is where a change under review can be *looked at*,
test is where the state of `main` is exercised, prod is the live system that a food distribution
depends on.

## Decision

**The branch a commit is on decides which environment it reaches. Nothing is deployed by hand.**

| Trigger | Image tag | Deploys to | Gate |
|---|---|---|---|
| Pull request opened/updated | short commit SHA of the PR head | **dev** | image built (not the full test suite); skipped for Dependabot |
| Push to `main` | short commit SHA | **test** | build **and** unit tests **and** e2e must pass |
| Push to `release` | semantic version + `latest` | **test**, then **prod** | as above, plus a GitHub release, the user-guide PDF, and the Saturday window check |

Non-release builds are tagged with a seven-character commit SHA, which is also what the frontend
shows as the running version; only a release produces a semantic version and moves `latest`.

A `changes` job classifies the touched files first, and the callers gate on its output, so a change
skips the jobs that cannot say anything about it — a docs-only pull request runs no build, no tests,
no image and no deployment. The classification deliberately lives in a job rather than in `paths:`
filters on the workflow triggers: a workflow that never starts leaves its checks *pending* forever,
while a job skipped by an `if:` reports a proper "skipped" conclusion. A change under
`.github/workflows/` counts as a change to every area, since the only proof a pipeline change works
is running it.

- Each environment has a concurrency group, so two runs cannot deploy to the same environment at once.
- Deploying to dev deliberately requires only a successful build: the point of dev is to *see* a
  change while it is being reviewed, including one whose tests are still failing.
- `main` is the "must be green" pipeline — deployment requires backend and frontend unit tests **and**
  e2e to have passed, not just a build.
- The release pipeline additionally derives the version from commit history
  ([ADR-0012](0012-conventional-commits-drive-releases.md)), publishes the German user-guide PDF
  ([ADR-0028](0028-user-guide-in-repo-published-per-release.md)), and passes through
  `check-deploy-window` ([ADR-0013](0013-saturday-production-deploy-freeze.md)).

## Consequences

- What runs in each environment is a function of git state, so "what is on test?" is answered by
  looking at `main` rather than by asking who deployed last.
- A reviewer can open the dev environment and use the change, which for a UI-heavy application is
  worth more than reading the diff.
- **Dev is not a quality gate.** It can be running a change whose tests fail — by design. Nobody
  should infer from "it works on dev" that the pipeline is green.
- Every PR deploys to dev, so the last PR to build wins the environment. With a small team that is
  acceptable; with parallel reviews it means dev may not be showing your change.
- Promotion is coarse: a fix reaches prod by going through `main` and then `release`, not by being
  deployed straight there. That is the intended protection, and it means an urgent hotfix follows the
  same path.
- Dependabot PRs skip the dev deploy — they should not take over the review environment for a
  dependency bump.
- Because jobs are skipped rather than filtered out at the trigger, a docs-only PR shows its checks
  as "skipped" instead of hanging as "pending" — the distinction that makes required checks usable.
  The cost is that the classification list is a second place that has to learn about a new top-level
  directory; a path nobody classified falls into the catch-all and ships nothing.

## Alternatives considered

**Manual deploys from a tag.** Rejected: it makes deployment a person's job with a person's error
rate, and it is exactly the ritual a volunteer team will do inconsistently.

**One environment (prod only).** Rejected: there would be nowhere to look at a change before it
reaches the live system, and no rehearsal of the migrate-on-boot path.

**Deploy every PR to its own ephemeral environment.** The fix for the "last PR wins dev" problem, and
rejected on infrastructure cost: it needs per-PR hosts and databases, which this deployment does not
have.

**Require full green before deploying to dev.** Rejected: it would make the review environment
unavailable for exactly the changes that most need looking at.

## References

- `.github/workflows/pull_request.yml`, `main_push.yml`, `release.yml`
- `.github/workflows/subflow_deploy.yml`, `subflow_docker_image.yml`
- `README.md` — "CI/CD"
</content>
