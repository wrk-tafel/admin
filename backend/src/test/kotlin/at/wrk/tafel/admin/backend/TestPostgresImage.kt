package at.wrk.tafel.admin.backend

// Single source for every Testcontainers-based IT (see TafelBaseIntegrationTest,
// InitialAdminUserServiceIT, TestdataScriptIT), so it stays in sync with docker-compose.yml and the
// e2e/lighthouse CI services without hunting down every occurrence by hand. Deliberately a plain
// Kotlin constant rather than a Gradle-supplied value: these tests also run directly from an IDE,
// not just via Gradle, so the version has to be available on the JVM classpath already.
const val TEST_POSTGRES_IMAGE = "postgres:18-bookworm"
