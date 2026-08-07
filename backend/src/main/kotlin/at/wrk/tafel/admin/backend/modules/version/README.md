# Version Module

Reports which release of the application is currently running, so the frontend can display it.
That is the module's entire scope — it owns no data, no business rules, and no entities.

```java
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {}
)
package at.wrk.tafel.admin.backend.modules.version;
```

It is a leaf in both directions: it depends on no other application module, and no other
application module depends on it. Its only consumer is the frontend, over HTTP
(`VersionApiService`, displayed at the bottom of the sidebar in `DefaultLayoutComponent`). That is
also why it is a top-level module rather than a slice of `base`: `base` holds concerns that other
*backend* modules consume through a named interface, and nothing here is consumed that way.

## Components

- [`VersionController`](VersionController.kt): `GET /api/version`, requires only
  `isAuthenticated()` — returns the currently running release version and when the image was built.
- [`VersionResponse.kt`](VersionResponse.kt): `VersionResponse(version, buildTime)`.

## Where the values come from

Both values come from `TafelAdminProperties` (`config/properties/TafelAdminProperties.kt`), which
default to `"dev"`/`"unknown"` and are overridden by the `TAFELADMIN_VERSION`/`TAFELADMIN_BUILD_TIME`
env vars baked into the Docker image at build time — the former from the git tag computed in
`.github/workflows/release.yml`, the latter a UTC timestamp computed at the moment the image is
built in `.github/workflows/subflow_docker_image.yml` (see `_build/Dockerfile`).
