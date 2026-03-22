plugins {
    alias(libs.plugins.sonarqube)
}

sonar {
    properties {
        property("sonar.host.url", "https://sonarcloud.io")
        property("sonar.qualitygate.wait", "false")
    }
}
