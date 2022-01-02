package at.wrk.tafel.admin.backend

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@SpringBootApplication
@ConfigurationPropertiesScan
@ExcludeFromTestCoverage
class AdminBackendApplication

@ExcludeFromTestCoverage
fun main(args: Array<String>) {
    runApplication<AdminBackendApplication>(*args)
}
