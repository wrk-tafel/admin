# ADR-0042: Deployments run in GitHub environments, with an on-demand deploy beside the automatic one

**Status:** superseded by [ADR-0043](0043-every-environment-deploys-automatically.md) · **Recorded:** 2026-08-10

Supersedes [ADR-0026](0026-branch-based-promotion-through-environments.md).

## Context

[ADR-0026](0026-branch-based-promotion-through-environments.md) made the branch a commit sits on
decide which of dev, test and prod it reaches, and ruled out deploying by hand. That part works and
is kept. Two things it did not provide turned out to be wanted.

**GitHub did not know a deployment had happened.** `subflow_deploy.yml` ran an SSH command and
nothing else; no job declared an `environment:`, so the repository's Deployments page held a single
entry from 2022, the whole environment feature set — protection rules, per-environment secrets and
variables, deployment history — had nothing to attach to, and "what is running on test, and since
when?" was answerable only by reading workflow logs.

**Branch-based promotion cannot express "put *this* build somewhere else, now."** Reproducing a
release build on dev to chase a report, or exercising a pull request's image on test before merging
it, both mean rebuilding the world on a branch whose only purpose is to trigger the right pipeline.

At the same time, "nothing is deployed by hand" was aimed at a real failure mode: a volunteer team
doing manual deploys does them inconsistently, and the live system a food distribution depends on
should not be reachable that way. Whatever gets added must not become the ordinary path.

## Decision

**Every deploy runs in a GitHub environment, and beside each automatic deploy the pipeline carries
an otherwise identical one that only happens when somebody approves it.**

`subflow_deploy.yml` declares `environment: ${{ inputs.githubEnvironment || inputs.environment }}`.
Its existing `environment` input keeps naming the *folder on the server* the deploy command is
handed; the new `githubEnvironment` input names the *GitHub environment* the deployment is recorded
against, and defaults to the folder. Five environments exist:

| Environment | Protection | Used by |
|---|---|---|
| `dev`, `test`, `prod` | none — these deploy automatically | the automatic jobs below |
| `dev-manual`, `test-manual` | one required reviewer | the on-request jobs below |

Automatic promotion is exactly as before, and is still the path a change takes to production:

| Trigger | Image tag | Deploys automatically to | Gate |
|---|---|---|---|
| Pull request opened/updated | short commit SHA of the PR head | **dev** | image built (not the full test suite); skipped for Dependabot |
| Push to `main` | short commit SHA | **test** | build **and** unit tests **and** e2e must pass |
| Push to `release` | semantic version + `latest` | **test**, then **prod** | as above, plus a GitHub release, the user-guide PDF, and the Saturday window check ([ADR-0013](0013-saturday-production-deploy-freeze.md)) |

On top of that, all three pipelines carry a `deploy-dev-manual` and a `deploy-test-manual` job.
They call the same reusable workflow with the same image tag and the same server folder as their
automatic counterpart — the only difference is the environment name, and therefore the reviewer
gate. The job appears in the run as *Deployment review pending* and deploys when approved.

- **There is no `prod-manual`.** The only route to production stays the release pipeline, through
  the Saturday window check. An on-demand deploy is for the two environments whose purpose is
  looking at something.
- **A manual job mirrors the `needs:` of the automatic deploy in its own pipeline**, so a deploy
  somebody clicks is never *less* gated than the one that run performs on its own: build-only on a
  pull request, fully green on `main`, after the GitHub release on `release`.
- **The manual jobs carry no concurrency group, deliberately.** A job waiting for a deployment
  review holds the concurrency group it belongs to. Putting them in `dev-environment` /
  `test-environment` alongside the automatic deploys would mean one pull-request run nobody ever
  clicks blocks every later deploy to that environment. The automatic deploys keep their groups, so
  the property ADR-0026 wanted — two *automatic* runs cannot deploy to the same environment at once
  — is unchanged; two people approving two manual deploys of the same environment within the same
  minute is the case that is now possible and is accepted.
- **Deployment branch policies are left at "all branches".** `release.yml` is `workflow_dispatch`-
  able from any branch and pull-request runs deploy from feature branches, so a branch policy would
  mostly break legitimate deploys; the reviewer gate is what actually protects the manual path.
- **The SSH secrets stay repository-level** and keep being passed into the reusable workflow. One
  host, one deploy command that takes the folder as an argument — there is nothing per-environment
  to hold yet.

## Consequences

- The Deployments page becomes the answer to "what is on test and since when", with a per-environment
  history and a link to the run that produced it. Nothing has to be reconstructed from logs.
- **Every run that reaches the deploy stage shows two jobs waiting for a deployment review**, and
  the run stays *in progress* until each is approved or rejected — a run left alone fails after
  GitHub's 30-day approval timeout. Rejecting is how a run is closed out without deploying. These
  jobs must therefore never be added to the required status checks of a branch protection rule.
- A manual test deploy from a pull request puts unmerged code on test and announces it to nobody;
  the next push to `main` silently overwrites it. "Test is what `main` is" is now a convention that
  holds between manual deploys rather than a property of the pipeline.
- Per-environment secrets and variables are available the day something does differ per environment
  — a second host, a different deploy command — without touching any caller.
- Five environments are now a second place that has to learn about a new deploy target, alongside
  the workflow files. A job pointed at an environment that does not exist gets one created
  implicitly, with no protection at all, which is the quiet failure mode to watch for: a
  mistyped `githubEnvironment` produces an *ungated* deploy rather than an error.

## Alternatives considered

**Leave deployments untracked, as before.** Rejected: it is the status quo that made the deployment
history unreadable, and every protection rule and per-environment secret this project might want
later hangs off environments existing.

**A standalone `workflow_dispatch` deploy workflow instead of in-pipeline jobs.** The obvious
alternative, and it has the advantage that nothing ever sits pending. Rejected because the question
being asked is almost always "deploy *this* build", and the run that built it already knows the tag;
a dispatch form makes the operator retype a commit SHA and pick an environment, which is precisely
the manual ritual with a person's error rate that ADR-0026 set out to avoid.

**Required reviewers on the automatic `prod` deploy.** Rejected: production is already gated by the
`release` branch and the Saturday window, and an approval there would leave every release run parked
halfway, holding the release concurrency group.

**One concurrency group per environment shared by the automatic and manual jobs.** Rejected on the
waiting-job lock described above — it converts a forgotten pull request into a stuck environment.

**Scoping the SSH secrets to each environment.** Deferred rather than rejected: it is the natural
next step if the environments ever stop sharing a host, and the environments now exist to hold them.

## References

- `.github/workflows/subflow_deploy.yml` — the `environment:` declaration and both inputs
- `.github/workflows/pull_request.yml`, `main_push.yml`, `release.yml` — the automatic and manual jobs
- [ADR-0013](0013-saturday-production-deploy-freeze.md) — the Saturday production freeze
- [ADR-0012](0012-conventional-commits-drive-releases.md) — where the release version comes from
- [ADR-0002](0002-single-deployable-image-with-independent-builds.md) — the one artefact all three environments run
- `README.md` — "CI/CD"
