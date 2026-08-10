# ADR-0043: Every environment deploys automatically, dev from all three pipelines

**Status:** accepted · **Recorded:** 2026-08-10

Supersedes [ADR-0042](0042-deployments-through-github-environments.md).

## Context

[ADR-0042](0042-deployments-through-github-environments.md) kept branch-based promotion and added a
second, clickable way to deploy: beside each automatic job, every pipeline carried a
`deploy-dev-manual` and a `deploy-test-manual` job pointed at a `dev-manual` / `test-manual` GitHub
environment with a required reviewer. The half of that decision about recording deploys against
GitHub environments works and is kept. The on-demand half did not pay for itself.

**Every run that reached the deploy stage ended with two jobs waiting for a click.** That was
predicted in ADR-0042's consequences and accepted; in practice it means no pipeline run ever reaches
a terminal state on its own. A run is *in progress* until somebody approves or rejects two jobs it
was never meant to perform, the runs list stops distinguishing "still working" from "waiting for a
human who is not coming", and a forgotten run fails 30 days later with a deployment-approval
timeout. On a volunteer team that is the normal case, not the exception.

**The environments the manual jobs deployed to were already reachable.** A pull request deploys its
own image to dev automatically, and what someone actually wanted from `deploy-test-manual` — the
merged state on test — is what the `main` pipeline does by itself. The remaining case, putting an
unmerged branch on test, is the one ADR-0042 already noted breaks the "test is what `main` is"
convention and announces itself to nobody.

**Dev, meanwhile, was only ever fed by pull requests.** Between merging a PR and opening the next
one, dev keeps running whatever branch happened to be deployed there last — including a branch that
was closed unmerged. Nothing puts the merged state or a release back onto it.

## Decision

**Deploys happen automatically or not at all, and dev is deployed by all three pipelines.**

The `deploy-dev-manual` and `deploy-test-manual` jobs are removed from `pull_request.yml`,
`main_push.yml` and `release.yml`, and `subflow_deploy.yml` loses its `githubEnvironment` input —
the GitHub environment a deploy is recorded against is once again exactly the server folder it
writes to. Three environments remain (`dev`, `test`, `prod`), none of them carrying a protection
rule.

`main_push.yml` and `release.yml` each gain a `deploy-dev` job: the same reusable workflow, the same
image tag and the same `needs:` as that pipeline's `deploy-test`, in the `dev-environment`
concurrency group. The full promotion picture:

| Trigger | Image tag | Deploys automatically to | Gate |
|---|---|---|---|
| Pull request opened/updated | short commit SHA of the PR head | **dev** | image built (not the full test suite); skipped for Dependabot |
| Push to `main` | short commit SHA | **dev** and **test** | build **and** unit tests **and** e2e must pass |
| Push to `release` | semantic version + `latest` | **dev**, **test**, then **prod** | as above, plus a GitHub release, the user-guide PDF, and the Saturday window check ([ADR-0013](0013-saturday-production-deploy-freeze.md)) |

- **Dev is last-writer-wins, deliberately.** A pull-request deploy overwrites the merged state that
  is on dev, and the next merge to `main` overwrites the pull request again. Dev is the environment
  for looking at something; the merge and release pipelines simply make its resting state the
  merged one instead of whatever was reviewed last.
- **Every deploy job carries its environment's concurrency group** — `dev-environment`,
  `test-environment`, `prod-environment`. With no job ever waiting on a human, the reason ADR-0042
  had to keep jobs *out* of those groups is gone, and two runs can no longer deploy the same
  environment at once.
- **Deploying a specific build to a specific environment on demand is not supported.** Re-running a
  run's deploy job redeploys that run's image, which covers "put this build back"; anything else
  means pushing a branch. This is the ADR-0026 position, restored.

## Consequences

- A pipeline run now ends on its own. Nothing sits in *Deployment review pending*, no run expires
  after 30 days, and the run list means what it says.
- Dev runs the merged state again between pull requests, and a release is visible on dev without
  anyone clicking. Reproducing a report against dev no longer needs a branch pushed to get it there.
- **The `dev-manual` and `test-manual` GitHub environments become unused** and should be deleted in
  the repository settings. Left in place they are harmless but misleading — the required reviewer on
  them now protects nothing.
- Any branch protection rule that named a `deploy-*-manual` job as a required check has to drop it;
  the job no longer exists. (ADR-0042 already forbade that, so there should be none.)
- Every merge to `main` deploys twice, and every release three times — one extra SSH deploy per run
  against a host that was already handling the others. Dev restarts on every merge, which is what
  makes its content predictable.
- Per-environment secrets and variables remain available on the three environments the day
  something does differ per environment.

## Alternatives considered

**Keep the manual jobs and accept the pending runs.** Rejected: that is the status quo, and the
cost — no run ever finishing by itself — falls on every run, while the benefit was claimed by
almost none.

**Keep the manual jobs but only in `release.yml`.** The narrowest fix, aimed at the one case ADR-0042
argued best (reproducing a release build on dev to chase a report). Rejected because the automatic
`deploy-dev` added here covers exactly that case without a click: the release lands on dev as part
of the run that built it.

**A standalone `workflow_dispatch` deploy workflow.** Rejected again, for the reason ADR-0042 gave:
it makes an operator retype a commit SHA and pick an environment, which is the manual ritual with a
person's error rate. Nothing has changed about that, and with dev now fed by all three pipelines
there is less left for it to do.

**Deploy dev only from `main`, not from pull requests.** Would make dev's content unambiguous, but
removes the one thing dev is for — looking at a change while it is still under review. Rejected.

**Deploy `main` to dev but not the release.** Rejected as a distinction without a rule anyone would
remember: the point is that the three non-production environments run the same artefact unless
somebody is actively looking at a branch.

## References

- `.github/workflows/subflow_deploy.yml` — the `environment:` declaration and its inputs
- `.github/workflows/pull_request.yml`, `main_push.yml`, `release.yml` — the deploy jobs
- [ADR-0042](0042-deployments-through-github-environments.md) — the decision this supersedes
- [ADR-0013](0013-saturday-production-deploy-freeze.md) — the Saturday production freeze
- [ADR-0002](0002-single-deployable-image-with-independent-builds.md) — the one artefact all environments run
- `README.md` — "CI/CD"
