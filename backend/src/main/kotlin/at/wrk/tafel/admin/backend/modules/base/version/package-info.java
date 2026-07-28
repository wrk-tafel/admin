/**
 * Exposes the running application's release version (a git tag, injected as the
 * TAFELADMIN_VERSION env var at Docker image build time - see .github/workflows/release.yml and
 * _build/Dockerfile) so the frontend can display it. Not consumed by any other backend module.
 */
@org.springframework.modulith.NamedInterface("version")
package at.wrk.tafel.admin.backend.modules.base.version;
