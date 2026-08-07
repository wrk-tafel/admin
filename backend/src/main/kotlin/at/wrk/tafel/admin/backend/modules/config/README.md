# Config Module

Serves the deployment-wide facts the frontend needs about the backend it is talking to: which
release is running, and which optional features this environment has switched on. That is the
module's entire scope — it owns no data, no business rules, and no entities.

```java
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {}
)
package at.wrk.tafel.admin.backend.modules.config;
```

It is a leaf in both directions: it depends on no other application module, and no other
application module depends on it. Its only consumer is the frontend, over HTTP
(`ConfigApiService`). That is also why it is a top-level module rather than a slice of `base`:
`base` holds concerns that other *backend* modules consume through a named interface, and nothing
here is consumed that way.

Everything it serves comes from `TafelAdminProperties` (`config/properties/TafelAdminProperties.kt`)
— it reads configuration and hands it on, which is why it needs no service layer of its own. Note
the distinction from that `config` package: `config/` holds the application's own Spring wiring,
while this module is the read-only HTTP view of it for the frontend.

## Components

- [`ConfigController`](ConfigController.kt): `GET /api/config`, requires only `isAuthenticated()`,
  plus `GET /api/config/public`, which anyone may call.
- [`ConfigResponse.kt`](ConfigResponse.kt): `ConfigResponse(version, buildTime, scannerFolderEnabled)`
  and `PublicConfigResponse(environmentLabel)`.

## The public endpoint

The login page has to show which environment is being logged into before anyone has a session, so
the environment label — and nothing else — is served from a second, unauthenticated endpoint listed
in `WebSecurityConfig.publicEndpoints`. It is a separate endpoint rather than `/api/config`
answering with less to an anonymous caller because `TafelJwtAuthConverter` rejects a cookie-less
API request before any controller runs; serving both audiences from one path would mean reworking
the authentication filter chain. Which release is running and which optional features exist stay
behind authentication.

## Where the values come from

`version`/`buildTime` default to `"dev"`/`"unknown"` and are overridden by the
`TAFELADMIN_VERSION`/`TAFELADMIN_BUILD_TIME` env vars baked into the Docker image at build time —
the former from the git tag computed in `.github/workflows/release.yml`, the latter a UTC timestamp
computed at the moment the image is built in `.github/workflows/subflow_docker_image.yml` (see
`_build/Dockerfile`). They are displayed at the bottom of the sidebar in `DefaultLayoutComponent`.

`scannerFolderEnabled` mirrors `TafelAdminStorageProperties.scannerFolderAvailable`
(`tafeladmin.storage.scannerPath` plus the `tafeladmin.storage.scannerEnabled` kill switch) — the
same rule `household`'s `ScannerFileService` enforces server-side, so the UI can't offer a document
source the backend would refuse to serve.

## Adding a feature flag here

A flag belongs in `ConfigResponse` when the frontend has to know it *before* it can render
correctly — hiding a control that would otherwise dead-end. Anything the user can change at runtime
belongs in the `settings` module instead; this one only reports what the deployment was configured
with.
