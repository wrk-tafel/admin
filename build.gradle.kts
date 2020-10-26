val nodeVersion by extra("12.19.0")

plugins {
    id("com.github.node-gradle.node") version "3.0.0-rc3" apply false
    id("com.palantir.docker") version "0.25.0" apply false
    id("org.springframework.boot") version "2.3.4.RELEASE" apply false
    id("io.spring.dependency-management") version "1.0.10.RELEASE" apply false
    kotlin("jvm") version "1.4.10" apply false
    kotlin("plugin.spring") version "1.4.10" apply false
    kotlin("plugin.jpa") version "1.4.10" apply false
}

subprojects {
    repositories {
        mavenCentral()
        jcenter()
    }
}
