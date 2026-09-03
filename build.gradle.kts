plugins {
    alias(libs.plugins.sonarqube)
}

sonar {
    properties {
        property("sonar.host.url", "https://sonarcloud.io")
        property("sonar.qualitygate.wait", "false")
        property(
            "sonar.coverage.exclusions",
            "**/*spec.ts,**/*config.ts,**/*conf.js,docs/userguide/**,frontend/src/main/webapp/cypress/**,frontend/src/main/webapp/src/environments/**,frontend/src/main/webapp/src/main.ts,frontend/src/main/webapp/src/test.ts,frontend/src/main/webapp/src/app/app.routing.ts,frontend/src/main/webapp/src/app/app.module.ts,frontend/src/main/webapp/src/app/**/*-routing.module.ts"
        )
        // Written by `npm run test-ci` (see vitest-base.config.ts) and carried into the sonar job as
        // an artifact. The "ng" segment is the Angular project's name: the unit-test builder always
        // writes to coverage/<project>/ and offers no option to change that, so this path follows it
        // rather than the other way round.
        property("sonar.javascript.lcov.reportPaths", "frontend/src/main/webapp/coverage/ng/lcov.info")
    }
}
