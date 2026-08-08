plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.spring)
    alias(libs.plugins.kotlin.jpa)
    alias(libs.plugins.kotlin.allopen)
    alias(libs.plugins.spring.boot)
    alias(libs.plugins.ktlint.gradle)
    jacoco
}

group = "at.wrk.tafel"
// Local/dev builds only — release versions are computed from git tags in release.yml, not from this field.
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(26)
    }

    sourceSets {
        main {
            // package-info.java files (Spring Modulith module boundaries) live next to the Kotlin sources
            java.srcDir("src/main/kotlin")
        }
    }
}

kotlin {
    compilerOptions {
        freeCompilerArgs.add("-Xjsr305=strict")
    }
}

repositories {
    mavenCentral()
}

dependencyLocking {
    lockAllConfigurations()
}

dependencies {
    constraints {
        // Transitive-only Jackson 2.x line (via jjwt-jackson / swagger-core-jakarta), separate from the
        // Jackson 3.x used directly in this project. Locked resolution pulled in 2.21.4, vulnerable to
        // GHSA-mhm7-754m-9p8w, CVE-2026-54515 and CVE-2026-59889; all three are fixed in 2.21.5.
        implementation(libs.jackson.databind.legacy) {
            because("Fixes GHSA-mhm7-754m-9p8w, CVE-2026-54515, CVE-2026-59889 (JsonView bypass / ignored-properties issues)")
        }
    }

    // implementation
    implementation(platform(libs.spring.boot.bom))
    implementation(platform(libs.spring.modulith.bom))
    implementation(platform(libs.spring.cloud.bom))
    implementation(libs.kotlin.stdlib.jdk8)
    implementation(libs.kotlin.reflect)
    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.spring.boot.starter.actuator)
    implementation(libs.spring.boot.starter.web)
    implementation(libs.spring.boot.starter.validation)
    implementation(libs.spring.boot.starter.jdbc)
    implementation(libs.spring.boot.starter.flyway)
    implementation(libs.spring.boot.starter.data.jpa)
    implementation(libs.spring.boot.starter.security)
    implementation(libs.spring.boot.starter.mail)
    implementation(libs.spring.boot.starter.jackson)
    implementation(libs.spring.boot.starter.thymeleaf)
    implementation(libs.spring.modulith.starter.core)
    implementation(libs.spring.modulith.actuator)
    // Only for ContextRefresher, which re-runs Spring Boot's config-data pipeline against an already
    // running context - that is what makes editing the mounted config.yml take effect without a
    // restart (see ConfigFileReloadService). Deliberately just this one artifact and not a Spring
    // Cloud starter: there is no config server, no config client and no bus in this deployment.
    implementation(libs.spring.cloud.context)
    implementation(libs.spring.security.messaging)
    implementation(libs.spring.retry)
    implementation(libs.flyway.database.postgresql)
    implementation(libs.jackson.module.kotlin)
    implementation(libs.jackson.dataformat.xml)
    implementation(libs.postgresql)
    implementation(libs.jjwt.api)
    implementation(libs.bouncycastle)
    implementation(libs.apache.fop)
    implementation(libs.qrcode.kotlin.jvm)
    implementation(libs.passay)
    implementation(libs.apache.commons.csv)
    implementation(libs.apache.commons.lang3)
    implementation(libs.springdoc.openapi.starter.webmvc.ui)

    // runtimeOnly
    runtimeOnly(libs.jjwt.impl)
    runtimeOnly(libs.jjwt.jackson)
    runtimeOnly(libs.micrometer.registry.prometheus)

    // developmentOnly
    developmentOnly(platform(libs.spring.boot.bom))
    developmentOnly(libs.spring.boot.devtools)

    // annotationProcessor
    annotationProcessor(platform(libs.spring.boot.bom))
    annotationProcessor(libs.spring.boot.configuration.processor)

    // testImplementation
    testImplementation(platform(libs.spring.boot.bom))
    testImplementation(platform(libs.spring.modulith.bom))
    testImplementation(libs.jjwt.impl)
    testImplementation(libs.spring.boot.starter.test)
    testImplementation(libs.spring.boot.starter.jdbc.test)
    testImplementation(libs.spring.boot.starter.data.jpa.test)
    testImplementation(libs.spring.security.test)
    testImplementation(libs.spring.modulith.starter.test)
    testImplementation(libs.mockk.jvm)
    testImplementation(libs.archunit.junit5)
    testImplementation(libs.testcontainers)
    testImplementation(libs.testcontainers.junit.jupiter)
    testImplementation(libs.testcontainers.postgresql)
    testImplementation(libs.apache.pdfbox)
    testImplementation(libs.image.comparison)
    testImplementation(libs.awaitility)
}

tasks.named<org.springframework.boot.gradle.tasks.bundling.BootJar>("bootJar") {
    archiveFileName = "admin-backend.jar"
    mainClass = "at.wrk.tafel.admin.backend.AdminBackendApplicationKt"
}

tasks.named<Jar>("jar") {
    enabled = false
}

tasks.withType<Test> {
    useJUnitPlatform()
    include("**/*Test.class", "**/*IT.class")

    // Use German (Germany) locale for tests in CI so CSV/date/number formatting matches local dev
    systemProperty("user.language", "de")
    systemProperty("user.country", "DE")
    systemProperty("user.timezone", "Europe/Vienna")
}

jacoco {
    toolVersion = "0.8.14"
}

tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports {
        xml.required = true
        html.required = true
    }
}

tasks.test {
    finalizedBy(tasks.jacocoTestReport)
}

sonar {
    properties {
        property(
            "sonar.coverage.jacoco.xmlReportPaths",
            "${layout.buildDirectory.get().asFile}/reports/jacoco/test/jacocoTestReport.xml",
        )
        property("sonar.kotlin.source.version", libs.versions.kotlin.get())
    }
}
