group = "at.tafel1030.admin"
version = findProperty("buildVersion") ?: "99.99.99"

val nodeVersion by extra("12.19.0")
val javaVersion by extra(JavaVersion.VERSION_11)
val imageTag by extra(findProperty("imageTag") ?: "local")

plugins {
    id("com.github.node-gradle.node") version "3.0.0-rc3" apply false
    id("com.palantir.docker") version "0.25.0" apply false
    id("org.springframework.boot") version "2.3.4.RELEASE" apply false
    id("io.spring.dependency-management") version "1.0.10.RELEASE" apply false
    id("org.jetbrains.kotlin.jvm") version "1.4.10" apply false
    id("org.jetbrains.kotlin.plugin.spring") version "1.4.10" apply false
    id("org.jetbrains.kotlin.plugin.jpa") version "1.4.10" apply false
}

subprojects {
    repositories {
        mavenCentral()
        jcenter()
    }
}

tasks.register<DefaultTask>("buildAll") {
    description = "Admin: Builds both docker images for backend and frontend"
    group = "Tafel1030"

    //dependsOn(":backend:bootBuildImage")
    // TODO fix task
    dependsOn(":frontend:npm_run_build")
            .dependsOn(":frontend:docker")
}
