# Plan: Migrate Maven to Gradle

## Context

The project currently uses Maven as its build tool across a multi-module setup (root + backend + frontend). Migrating to Gradle with Kotlin DSL brings modern build scripting, better incremental build support, and a version catalog for centralized dependency management.

## Scope

### New files to create
1. `gradle/libs.versions.toml` — Version catalog (all dependency versions + library aliases + plugin aliases)
2. `settings.gradle.kts` — Root settings declaring both subprojects
3. `build.gradle.kts` — Root build (SonarQube plugin)
4. `backend/build.gradle.kts` — Backend build (Kotlin, Spring Boot, JaCoCo, frontend copy task)
5. `frontend/build.gradle.kts` — Frontend build (Exec tasks for npm install/test/build)
6. `gradle.properties` — JVM args, parallel builds, caching
7. Gradle wrapper files (via `gradle wrapper`) — `gradlew`, `gradlew.bat`, `gradle/wrapper/*`

### Files to modify
8. `.gitignore` — Replace `target/` entries with `build/`
9. `.github/workflows/subflow_build.yml` — `./mvnw` → `./gradlew`, `cache: maven` → `cache: gradle`, `target/` → `build/`
10. `.github/workflows/subflow_e2e_test.yml` — `cache: maven` → `cache: gradle`
11. `.github/dependabot.yml` — `package-ecosystem: "maven"` → `"gradle"`
12. `backend/src/test/kotlin/.../CustomerPdfServiceTest.kt:37` — `target/custom-test-results/` → `build/custom-test-results/`
13. `CLAUDE.md` — Replace all Maven commands with Gradle equivalents

### Files to delete
14. `pom.xml`, `backend/pom.xml`, `frontend/pom.xml`
15. `mvnw`, `mvnw.cmd`, `.mvn/` directory

## Implementation Details

### Version catalog (`gradle/libs.versions.toml`)
Centralizes all versions from `backend/pom.xml` properties. Key entries:
- Kotlin 2.3.20, Spring Boot 4.0.3, Spring Modulith 2.0.3
- All 40+ library dependencies with proper aliases
- Plugin aliases for kotlin-jvm, kotlin-spring, kotlin-jpa, kotlin-allopen, spring-boot, spring-dependency-management, sonarqube

### Backend build (`backend/build.gradle.kts`)
- Plugins: kotlin-jvm, kotlin-spring, kotlin-jpa, kotlin-allopen, spring-boot, spring-dependency-management, jacoco
- Java toolchain: version 25
- Kotlin compiler: `-Xjsr305=strict`
- BOM imports via `dependencyManagement { imports { mavenBom(...) } }`
- Dependency scope mapping: compile→implementation, runtime→runtimeOnly, test→testImplementation, optional devtools→developmentOnly, optional config-processor→annotationProcessor
- `bootJar` task: `archiveFileName = "admin-backend.jar"`, `mainClass = "...AdminBackendApplicationKt"`
- `Copy` task: copies `frontend/src/main/webapp/dist/browser` → `build/resources/main/static`, depends on `:frontend:npmBuild`
- JaCoCo: XML + HTML reports, `test` finalized by `jacocoTestReport`
- Test: JUnit Platform, includes `**/*Test.class` and `**/*IT.class`

### Frontend build (`frontend/build.gradle.kts`)
- `base` plugin only
- Three `Exec` tasks: `npmInstall`, `npmTest`, `npmBuild`
- `assemble` depends on `npmBuild`, `check` depends on `npmTest`
- Input/output tracking for up-to-date checking

### CI/CD changes
- Build command: `./gradlew build` (replaces `./mvnw clean install`)
- Sonar command: `./gradlew sonar -Dsonar.token=...`
- Artifact path: `backend/build/libs/admin-backend.jar` (was `backend/target/admin-backend.jar`)
- Test results path: `backend/build/custom-test-results/` (was `backend/target/custom-test-results/`)

### Potential issues
- **Java 25 + Gradle compatibility**: Need to verify Gradle version supports Java 25. Will use latest stable Gradle.
- **`JvmTarget.fromTarget("25")`**: May not exist in Kotlin 2.3.20 — fallback: rely on Java toolchain inference.
- **`annotationProcessor` for Kotlin**: `spring-boot-configuration-processor` may need `kapt` instead — will test and adjust.
- **SonarQube plugin in subprojects**: The `sonar {}` blocks in subprojects need the root plugin to propagate. Will verify.

## Verification
1. `./gradlew build` — full build succeeds (frontend + backend + tests)
2. `./gradlew :backend:bootJar` — produces `backend/build/libs/admin-backend.jar`
3. Verify the jar contains `BOOT-INF/classes/static/` with frontend assets
4. `./gradlew :backend:test` — all backend tests pass
5. `./gradlew :frontend:npmTest` — frontend tests pass
6. `./gradlew :backend:bootRun --args='--spring.profiles.active=local'` — app starts correctly
