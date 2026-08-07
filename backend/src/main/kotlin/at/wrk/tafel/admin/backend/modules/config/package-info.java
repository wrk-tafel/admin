/**
 * Exposes the deployment-wide facts the frontend needs before it can render itself: which release
 * is running (a git tag, injected as the TAFELADMIN_VERSION env var at Docker image build time -
 * see .github/workflows/release.yml and _build/Dockerfile) and which optional features this
 * environment has switched on.
 * Has no allowed dependencies on other application modules, and no other application module
 * depends on it - its only consumer is the frontend, over HTTP.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {}
)
package at.wrk.tafel.admin.backend.modules.config;
