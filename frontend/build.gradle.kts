plugins {
    base
}

val webappDir = "src/main/webapp"

val npmInstall by tasks.registering(Exec::class) {
    description = "Install npm dependencies"
    workingDir(webappDir)
    commandLine("npm", "install")
    inputs.file("$webappDir/package.json")
    inputs.file("$webappDir/package-lock.json")
    outputs.dir("$webappDir/node_modules")
}

val npmTest by tasks.registering(Exec::class) {
    description = "Run frontend unit tests"
    workingDir(webappDir)
    commandLine("npm", "run", "test-ci")
    dependsOn(npmInstall)
}

val npmBuild by tasks.registering(Exec::class) {
    description = "Build frontend for production"
    workingDir(webappDir)
    commandLine("npm", "run", "build-prod")
    dependsOn(npmInstall)
    inputs.dir("$webappDir/src")
    inputs.file("$webappDir/angular.json")
    inputs.file("$webappDir/tsconfig.json")
    outputs.dir("$webappDir/dist")
}

tasks.named("assemble") {
    dependsOn(npmBuild)
}

tasks.named("check") {
    dependsOn(npmTest)
}

sonar {
    properties {
        property("sonar.coverage.exclusions", "**/*spec.ts,**/*config.ts,**/*conf.js,src/main/webapp/cypress/**,src/main/webapp/src/environments/**,src/main/webapp/src/main.ts,src/main/webapp/src/test.ts,src/main/webapp/src/app/app.routing.ts,src/main/webapp/src/app/app.module.ts,src/main/webapp/src/app/**/*-routing.module.ts")
        property("sonar.javascript.lcov.reportPaths", "$webappDir/coverage/lcov.info")
    }
}
