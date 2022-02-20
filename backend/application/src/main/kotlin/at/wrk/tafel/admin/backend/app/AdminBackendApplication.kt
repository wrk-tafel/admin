package at.wrk.tafel.admin.backend.app

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication
import org.springframework.web.servlet.config.annotation.EnableWebMvc

@ConfigurationPropertiesScan("at.wrk.tafel.admin.backend")
@ExcludeFromTestCoverage
@EnableWebMvc
@SpringBootApplication(scanBasePackages = ["at.wrk.tafel.admin.backend"])
class AdminBackendApplication

@ExcludeFromTestCoverage
fun main(args: Array<String>) {
    runApplication<AdminBackendApplication>(*args)
}
