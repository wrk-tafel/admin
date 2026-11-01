package at.wrk.tafel.admin.backend

// Every image a Testcontainers test starts, so that no test names one itself and Renovate has one
// file to update. Its custom manager in .github/renovate.json5 reads the constants below, so a new
// image has to follow their shape. Deliberately plain Kotlin constants rather than Gradle-supplied
// values: these tests also run directly from an IDE, not just via Gradle, so the versions have to be
// available on the JVM classpath already.
const val TEST_POSTGRES_IMAGE = "postgres:18.6-bookworm"
const val TEST_MAILPIT_IMAGE = "axllent/mailpit:v1.33.0"
