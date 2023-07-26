package at.wrk.tafel.admin.backend

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableAsync
import org.springframework.scheduling.annotation.EnableScheduling

@ConfigurationPropertiesScan("at.wrk.tafel.admin.backend")
@EnableScheduling
@EnableAsync
@SpringBootApplication(scanBasePackages = ["at.wrk.tafel.admin.backend"])
@ExcludeFromTestCoverage
class AdminBackendApplication

@ExcludeFromTestCoverage
fun main(args: Array<String>) {
    runApplication<AdminBackendApplication>(*args)
}
