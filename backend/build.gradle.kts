plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.spring)
    alias(libs.plugins.kotlin.jpa)
    alias(libs.plugins.kotlin.allopen)
    alias(libs.plugins.spring.boot)
    jacoco
}

group = "at.wrk.tafel"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(25)
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

dependencies {
    // implementation
    implementation(platform(libs.spring.boot.bom))
    implementation(platform(libs.spring.modulith.bom))
    implementation(libs.kotlin.stdlib.jdk8)
    implementation(libs.kotlin.reflect)
    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.logback.json.classic)
    implementation(libs.logback.jackson)
    implementation(libs.spring.boot.starter.actuator)
    implementation(libs.spring.boot.starter.web)
    implementation(libs.spring.boot.starter.jdbc)
    implementation(libs.spring.boot.starter.flyway)
    implementation(libs.spring.boot.starter.data.jpa)
    implementation(libs.spring.boot.starter.security)
    implementation(libs.spring.boot.starter.mail)
    implementation(libs.spring.boot.starter.jackson)
    implementation(libs.spring.boot.starter.thymeleaf)
    implementation(libs.spring.modulith.starter.jpa)
    implementation(libs.spring.modulith.actuator)
    implementation(libs.spring.security.messaging)
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
}

tasks.named<org.springframework.boot.gradle.tasks.bundling.BootJar>("bootJar") {
    archiveFileName = "admin-backend.jar"
    mainClass = "at.wrk.tafel.admin.backend.AdminBackendApplicationKt"
}

tasks.named<Jar>("jar") {
    enabled = false
}

val copyFrontend by tasks.registering(Copy::class) {
    description = "Copy frontend build output into backend static resources"
    from("${project.rootDir}/frontend/src/main/webapp/dist/browser")
    into("${layout.buildDirectory.get().asFile}/resources/main/static")
    dependsOn(":frontend:npmBuild")
}

tasks.named("processResources") {
    dependsOn(copyFrontend)
}

tasks.withType<Test> {
    useJUnitPlatform()
    include("**/*Test.class", "**/*IT.class")
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
        property("sonar.coverage.jacoco.xmlReportPaths", "${layout.buildDirectory.get().asFile}/reports/jacoco/test/jacocoTestReport.xml")
        property("sonar.kotlin.source.version", libs.versions.kotlin.get())
    }
}
