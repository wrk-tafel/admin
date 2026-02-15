package at.wrk.tafel.admin.backend.database.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.flywaydb.core.Flyway
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy
import org.springframework.context.ApplicationContext
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import javax.sql.DataSource

@Configuration
@ExcludeFromTestCoverage
class FlywayConfig(
    @Value("\${tafeladmin.testdata.enabled:false}") private val testdataEnabled: Boolean = false
) {

    @Bean
    fun flywayMigrationStrategy(
        dataSource: DataSource,
        applicationContext: ApplicationContext
    ): FlywayMigrationStrategy {
        return FlywayMigrationStrategy { flyway: Flyway ->
            if (testdataEnabled) {
                flyway.clean()
            }

            flyway.migrate()
        }
    }

}
