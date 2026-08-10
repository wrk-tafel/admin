# ADR-0010: Zoneless, standalone Angular with signal-based state

**Status:** accepted · **Recorded:** 2026-08-09

## Context

The frontend is a data-entry and live-status application: long reactive forms (household creation,
income validation, settings), paginated search tables, and several screens driven by SSE streams
that push new state at arbitrary times ([ADR-0005](0005-server-sent-events-with-a-transactional-outbox.md)).
It also runs on hardware in the distribution hall — a ticket-screen display and scanner stations —
where a screen that quietly stops updating is a visible problem in front of a queue of people.

Angular has moved its own recommended defaults over the app's lifetime: NgModules to standalone
components, `@Input`/`@Output` decorators to signal-based `input()`/`output()`, `*ngIf`/`*ngFor` to
built-in control flow, and Zone.js-based change detection to zoneless. Mixing both generations
across a codebase is the expensive outcome — every file needs the reader to work out which era it
belongs to.

## Decision

**The frontend commits to the current Angular generation, uniformly.**

- **Standalone components** everywhere; no NgModules. Feature modules are folders with a
  `<feature>.routes.ts`, lazy-loaded from `app.routes.ts`.
- **Zoneless change detection** — `provideZonelessChangeDetection()` in `main.ts`. There is no
  `ngZone.run()` anywhere, and SSE/`setTimeout` callbacks do not need one.
- **Signal-based APIs**: `input()` / `input.required()`, `output()`, `signal()` for local state,
  `computed()` for derived state (not methods), `effect()` in the constructor for side effects (not
  `ngOnInit`), `viewChild()` / `viewChildren()`, `toSignal()` to adapt Observables, `resource()` for
  fetches with built-in loading/error state.
- **Built-in control flow** `@if` / `@for` in templates, not `*ngIf` / `*ngFor`.
- Reactive forms for all form handling; custom validators in `common/validator/`.
- `inject()` for dependency injection; typed `HttpClient` calls behind `*-api.service.ts` services in
  `app/api/`; RxJS `BehaviorSubject`-based services for cross-component state; route guards and
  resolvers for permissions and data pre-fetching.
- Angular Material for components, Tailwind for layout and utility styling.

## Consequences

- Change detection runs when a signal actually changes, not on every scheduled task Zone.js patched.
  For the SSE-driven screens that is both less work and one less thing that can silently go wrong.
- No Zone.js means no `NgZone` reasoning at all — but it also means a component that mutates a plain
  field instead of a signal simply will not re-render, with no error. **This is the single most
  likely new-contributor bug** and the reason the signal rules are stated as rules rather than
  preferences.
- `computed()` instead of template method calls removes a whole class of "recomputed on every
  change-detection pass" performance problems.
- The codebase reads uniformly, which is the point of applying the conventions to *all* code rather
  than only new code. The cost is that third-party examples and older Angular answers have to be
  translated before use.
- `@if` / `@for` are compile-time constructs with better type narrowing — and `@for`'s `track`
  expression must produce unique keys. Duplicate track values break rendering and event handling
  silently rather than warning loudly.
- Being on the current generation means tracking Angular's own migration pace; the payoff is that
  each upgrade is a small step instead of an accumulated rewrite.
- Behaviour changes here need Cypress coverage, not just Vitest specs — a signal wiring mistake
  passes a unit test and fails the real screen (`CLAUDE.md`, "Frontend Tests").

## Alternatives considered

**Stay on NgModules + Zone.js + decorators.** Rejected: it is the generation Angular is moving away
from, so the cost of the migration grows with every new file, and Zone.js change detection is the
mechanism most likely to mis-handle the SSE-driven screens.

**Migrate incrementally, new code only.** Superficially safer, rejected in practice: it makes every
file a question about which era it belongs to, and permanently doubles the number of patterns a
contributor has to know.

**A different framework.** Not seriously considered — the application is large, working, and staffed
by people who know Angular.

## References

- `frontend/src/main/webapp/src/main.ts`, `src/app/app.config.ts`
- `CLAUDE.md` — "Frontend Architecture", "Code Conventions", "Signal-Based Patterns"
- `frontend/src/main/webapp/package.json` for exact versions
</content>
