package at.wrk.tafel.admin.backend.app

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@ConfigurationPropertiesScan("at.wrk.tafel.admin.backend")
@ExcludeFromTestCoverage
@SpringBootApplication(scanBasePackages = ["at.wrk.tafel.admin.backend"])
class AdminBackendApplication

@ExcludeFromTestCoverage
fun main(args: Array<String>) {
    runApplication<AdminBackendApplication>(*args)
}
