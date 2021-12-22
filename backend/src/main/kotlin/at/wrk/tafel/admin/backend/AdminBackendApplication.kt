package at.wrk.tafel.admin.backend

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@SpringBootApplication
@ConfigurationPropertiesScan
class AdminBackendApplication

fun main(args: Array<String>) {
    runApplication<AdminBackendApplication>(*args)
}
