# OpenSpec — evaluation

Analysis for [issue #3671](https://github.com/wrk-tafel/admin/issues/3671), which asks whether
[OpenSpec](https://github.com/Fission-AI/OpenSpec) — a spec-driven-development (SDD) toolkit for AI
coding assistants — would be beneficial to adopt in this repository. This is an evaluation, not a
decision record — nothing here is decided, and acting on any of it needs its own ticket.

**Recommendation up front: don't adopt it.** OpenSpec's value proposition is aligning humans and AI
on *what* to build, in a shared artifact, before code is written — and this repository already has
that, split across three mechanisms that are more specific to this project than OpenSpec's generic
templates would be: [ADRs](adr/README.md) and this very `docs/architecture/` folder for
already-decided and not-yet-decided architecture, and the `.claude/skills/` workflows
(`process-issue`, `process-pr`, ...) for the day-to-day propose→implement→review loop, driven by
GitHub issues rather than a parallel `openspec/` tree. [§5](#5-what-to-do-instead) covers what,
if anything, would actually move the needle here.

## 1. What OpenSpec is

OpenSpec (npm package `@fission-ai/openspec`, MIT licensed) is a CLI plus a set of AI-assistant
slash commands. `openspec init` creates an `openspec/` directory (`specs/` for the current source of
truth, `changes/` for in-flight proposals, `changes/archive/` for finished ones) and writes
tool-specific command/skill files — for Claude Code, `.claude/skills/openspec-*/SKILL.md` — so the
assistant recognizes `/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:archive` (and a few more
in its "expanded" command set) typed into chat.

The core idea is the **change folder**: each proposed feature gets its own
`proposal.md`/`design.md`/`tasks.md` plus delta specs (`ADDED`/`MODIFIED`/`REMOVED` requirements,
each with WHEN/THEN scenarios) written in plain Markdown. `/opsx:propose` drafts that folder,
`/opsx:apply` implements the task list against it, and `/opsx:archive` merges the delta into
`openspec/specs/` and files the change away — deliberately "delta-first" so an existing, undocumented
codebase never has to be fully specified up front, only the slice a given change touches.

It supports 30+ AI tools through per-tool command/skill file generation, and has a "Stores" beta for
sharing one spec source across multiple repositories/teams.

## 2. What this repository already has, doing the same job

| OpenSpec artifact | What it's for | This repo's equivalent |
|---|---|---|
| `openspec/changes/<name>/proposal.md` | Why a change, and its scope | The GitHub issue body/comments, plus the PR description's "Summary" section |
| `openspec/changes/<name>/design.md` | Technical approach, alternatives | An ADR (decided) or a `docs/architecture/*.md` evaluation (not yet decided) for anything substantial; ordinary changes get their reasoning in the PR description and commit messages |
| `openspec/changes/<name>/tasks.md` | Implementation checklist | The PR description's "Test plan" checklist, and the issue itself when it already lists steps |
| `openspec/changes/<name>/specs/*.md` (WHEN/THEN scenarios) | Concrete, reviewable behavior before coding | Cypress e2e specs *are* exactly this in executable form (`cypress/e2e/*.cy.ts`) — required for any new/changed user-facing behavior per [CLAUDE.md](../../CLAUDE.md#frontend-tests); the German user guide is the human-readable behavior description |
| `openspec/specs/` (merged, current truth) | Living requirements doc | `docs/architecture/adr/`, module `README.md` files, and `docs/userguide/` together, plus the code itself |
| `/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:archive` | The propose→implement→review loop, generic across tools | `.claude/skills/process-issue`, `process-pr`, `process-dependabot` — the same loop, but already encoding *this* project's rules (module boundaries, `Request`/`Response`/`Item` DTO suffixes, changelog bullet requirement, user-guide update requirement, Conventional-Commits branch/PR naming) that a generic OpenSpec template has no way to know about |
| Claude Code's own plan mode (`EnterPlanMode`) | Aligning on an approach before code, within one session | Already built into the tool this project standardizes on, no extra install |

The overlap isn't incidental — `docs/architecture/adr/README.md` already draws the same distinction
OpenSpec draws between decided and proposed ("Analyses" vs. the ADR index), and
[CLAUDE.md](../../CLAUDE.md#handling-issues-found-outside-the-current-tasks-scope) already routes
"bigger or unrelated" findings to a fresh GitHub issue rather than silently expanding scope — which
is the same discipline `/opsx:propose` exists to enforce, just via the issue tracker instead of a
second Markdown tree.

## 3. What adopting it would cost here

- **A second source of truth to keep in sync.** `openspec/specs/` would either duplicate the ADRs,
  module READMEs and user guide (drifting from whichever side gets updated first) or replace them —
  and replacing them means giving up the specificity CLAUDE.md and the ADR set already have (why a
  decision was made, what alternatives lost, project-specific naming/testing conventions) for
  OpenSpec's generic WHEN/THEN requirement format, which has no concept of e.g. this repo's DTO
  suffix rules or its Saturday deploy freeze.
- **A parallel workflow to the one already tuned for this repo.** `/opsx:propose`/`/opsx:apply` would
  sit next to `.claude/skills/process-issue`, doing a looser version of the same job with none of this
  project's specifics baked in (it wouldn't know to update `CHANGELOG.md`, add a Cypress case, or
  follow the ADR-vs-analysis split) — contributors would need to learn which of the two tools to
  reach for, and why.
- **Tool breadth that isn't used.** OpenSpec's main differentiator over narrower tools (Kiro,
  GitHub's Spec Kit) is supporting 30+ AI assistants from one spec set. This repository has no
  `.cursor/`, Copilot, or other assistant configuration — it standardizes on Claude Code, so that
  breadth buys nothing here.
- **An extra toolchain dependency.** `openspec init`/`update` needs a global npm install
  (`@fission-ai/openspec`, Node ≥ 20.19 — comfortably below this repo's own `package.json` `engines`
  floor of `^22.22.3`, so no version conflict, but still one more thing to install and keep current
  outside the two build tools (`gradlew`, `npm`) this repo already has).
- **Telemetry.** OpenSpec collects anonymous command names/version by default (disableable) — not a
  blocker, but worth knowing before installing it.
- **The multi-repo "Stores" feature doesn't apply.** This is a single-repository modular monolith
  ([ADR-0001](adr/0001-modular-monolith-with-spring-modulith.md),
  [ADR-0002](adr/0002-single-deployable-image-with-independent-builds.md)) with one codebase for
  both frontend and backend — there's no second repository to share specs with.

## 4. Where OpenSpec's actual idea has merit — and why it's already covered

The genuinely useful part of OpenSpec's pitch is real: an AI assistant given only chat history can
implement the wrong thing when a request is ambiguous, and writing the intended behavior down before
coding catches that early. But this repository already forces that moment in two places:

- **`process-issue`'s own step 1** reads the full issue *and its comments* before branching, because
  "scope often gets clarified in comments, not just the original body" — i.e., it already treats the
  issue as the proposal artifact and insists on reading it fully before acting.
- **Claude Code's plan mode** exists for exactly the "explore/propose before touching code" moment
  OpenSpec's `/opsx:explore`/`/opsx:propose` provide, without a second directory tree or a workflow
  fork.

A team of multiple human contributors using genuinely different AI tools, needing one shared spec
format all of those tools could read, is the situation OpenSpec is built for. That isn't this
project's situation today.

## 5. What to do instead

Nothing here needs a new tool:

1. **Keep using the existing split** — ADRs for decisions, `docs/architecture/*.md` analyses (like
   this one) for evaluations, GitHub issues/PR descriptions for day-to-day proposal-and-scope, and
   Cypress e2e specs as the executable behavior spec for user-facing changes.
2. **If a future change is genuinely large or ambiguous enough to want a written proposal before any
   code**, that's what plan mode and a well-written GitHub issue (or a `docs/architecture/` analysis,
   for anything architectural) are for — no extra install needed.
3. **If the `.claude/skills/process-issue` workflow itself is ever felt to be missing something**
   OpenSpec does well (e.g. a more structured task checklist inside the PR, or a lighter-weight
   "explore" step before drafting a plan), that's a targeted improvement to make to that skill
   directly, keeping it tailored to this repo, rather than importing a second, more generic workflow
   alongside it.

## 6. When this should be revisited

- **Multiple AI coding assistants in real use across contributors.** If people working on this repo
  start using genuinely different tools (Cursor, Copilot, etc.) and need one shared spec format all
  of them can read, that's OpenSpec's actual selling point over a Claude-Code-specific skill.
- **Cross-repository planning.** If this application is ever split across multiple repositories (or
  a second repository needs to share requirements with this one), OpenSpec's Stores feature is built
  for exactly that; a single modular monolith is not.
- **The existing ADR/skill split starts breaking down in practice** — e.g. proposals routinely
  outlive the GitHub issue they started from, or contributors keep losing track of "decided" vs.
  "proposed" despite the index in `adr/README.md`. That would be evidence the informal split needs
  more structure than it currently has, worth re-evaluating against OpenSpec or similar tools then.

## References

- [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) — canonical repository, MIT licensed
- [`adr/README.md`](adr/README.md) — this repo's existing decided/proposed split and ADR index
- [`rls-postgres-evaluation.md`](rls-postgres-evaluation.md), [`gdpr-compliance.md`](gdpr-compliance.md)
  — the two existing analyses this document follows the format of
- `.claude/skills/process-issue/SKILL.md`, `process-pr/SKILL.md`, `process-dependabot/SKILL.md` —
  this repo's existing propose→implement→review workflows
- [ADR-0001](adr/0001-modular-monolith-with-spring-modulith.md),
  [ADR-0002](adr/0002-single-deployable-image-with-independent-builds.md) — single-repository
  modular monolith, why OpenSpec's multi-repo "Stores" feature doesn't apply
- `CLAUDE.md` — [Handling Issues Found Outside the Current Task's Scope](../../CLAUDE.md#handling-issues-found-outside-the-current-tasks-scope),
  [Frontend Tests](../../CLAUDE.md#frontend-tests) (Cypress e2e as the behavior-spec requirement)
