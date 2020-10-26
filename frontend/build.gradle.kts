plugins {
    id("com.github.node-gradle.node")
    id("com.palantir.docker")
}

node {
    version.set(property("nodeVersion").toString())
    download.set(true)
}

docker {
    name = "toet/admin-frontend"
    // TODO set tag (version)

    //tags = mutableSetOf("${project.version}")
    //tags("${project.version}")
    //files(file("dist/*"))

    //tag("docker", "${project.version}")
    //files(distTar.outputs, 'my-file.txt')
    //files(tasks)
}
