plugins {
    id("com.github.node-gradle.node")
    id("com.palantir.docker")
}

node {
    version.set(property("nodeVersion").toString())
    download.set(true)
}

docker {
    name = "toet/admin-frontend:${project.property("imageTag")}"
    copySpec.from("dist").into("app")
}
