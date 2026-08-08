# ADR-0002: One deployable image, two independent builds

**Status:** accepted · **Recorded:** 2026-08-09

## Context

The system is a Spring Boot backend plus an Angular single-page application. Those are built by two
completely different toolchains (Gradle/JVM and npm/Angular CLI), on different release cadences, and
frontend work rarely needs the backend to rebuild or vice versa.

At the same time there is one host per environment, one nginx in front of it, and no CDN or object
store. Anything that ships as a second artifact is a second thing to deploy, version, and keep in
sync — and a frontend one version ahead of its backend is a class of bug nobody wants to debug on a
Saturday.

## Decision

**The two sides build independently; they are joined only when the container image is assembled, and
the backend serves the frontend.**

- There is no Gradle cross-dependency between `backend` and `frontend`. `./gradlew :backend:build`
  and `npm run build-prod` know nothing about each other.
- `_build/Dockerfile` copies the backend jar and `frontend/src/main/webapp/dist/browser/` into one
  image, the latter into `./static/`, from where Spring Boot serves it.
- `IndexHtmlController` serves `index.html` for `/` and acts as the SPA fallback for client-side
  routes (anything without a file extension that is not under `/api/`), so a bookmark or refresh on
  `/kunden/suchen` resolves to the app shell instead of a 404.
- The same image is deployed to dev, test and prod behind reverse proxies that may mount it at a
  path prefix. One backend property, `tafeladmin.server.relativeBaseUrl`, drives both the JWT cookie
  path and the `<base href>` that `IndexHtmlController` rewrites into `index.html` at request time,
  so the *identical* frontend build works at `/` and at `/tafel-admin/`.
- Because the environments share an origin at different prefixes rather than separate domains, the
  same controller also stamps `tafeladmin.environmentLabel` into the page title, the PWA manifest
  name/short name and the pre-Angular loading screen.

## Consequences

- One artifact, one version number, one deploy. The frontend can never be a different version than
  the backend it talks to, and CORS never enters the picture — same origin by construction.
- A frontend-only change still rebuilds and redeploys the whole image. That is accepted: releases
  are infrequent and the image build is cheap relative to the coordination it removes.
- The build pipeline, not the build tool, is what knows both halves exist. Anyone assembling an
  image by hand has to run both builds and stage both outputs first (documented in the root
  `README.md`).
- Serving static files from the app means the JVM is in the request path for every asset. At this
  traffic level that is irrelevant, and it is what makes the single-origin, prefix-agnostic
  deployment work.
- The `<base href>` rewrite is server-side and therefore invisible in the built artifact — a change
  to how the frontend resolves relative URLs has to be reasoned about together with
  `relativeBaseUrl` and the proxy's prefix stripping (see [#2972](https://github.com/wrk-tafel/admin/issues/2972),
  [#2978](https://github.com/wrk-tafel/admin/issues/2978)).

## Alternatives considered

**Gradle drives the frontend build** (a node plugin, frontend as a Gradle subproject). Rejected: it
couples every backend compile to node/npm availability and turns fast `ng` feedback loops into
Gradle invocations, for the sole benefit of one command building everything.

**Deploy the frontend separately** (nginx serving static files, or a CDN). Rejected: a second
artifact and a second deploy step, plus version skew between the two halves and CORS/cookie-domain
configuration — all of it to solve a static-asset-scaling problem this deployment does not have.

**Bundle the frontend into the jar as classpath resources.** Rejected: it would reintroduce the
build coupling above without changing anything at runtime, since the image already gives both sides
one filesystem.

## References

- `_build/Dockerfile`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/config/IndexHtmlController.kt`
- `README.md` — "Docker Image" and "Reverse Proxy Deployment (Subpath / Subdomain)"
- [#2972](https://github.com/wrk-tafel/admin/issues/2972),
  [#2978](https://github.com/wrk-tafel/admin/issues/2978) — base href behind a proxy prefix;
  [#3027](https://github.com/wrk-tafel/admin/issues/3027) — per-environment branding
</content>
