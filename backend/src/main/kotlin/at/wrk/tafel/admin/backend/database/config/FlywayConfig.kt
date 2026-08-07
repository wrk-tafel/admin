package at.wrk.tafel.admin.backend.database.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.flywaydb.core.Flyway
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy
import org.springframework.context.ApplicationContext
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import javax.sql.DataSource

@Configuration
@ExcludeFromTestCoverage
class FlywayConfig(
    private val tafelAdminProperties: TafelAdminProperties,
) {

    @Bean
    fun flywayMigrationStrategy(
        dataSource: DataSource,
        applicationContext: ApplicationContext,
    ): FlywayMigrationStrategy = FlywayMigrationStrategy { flyway: Flyway ->
        if (tafelAdminProperties.testdata.enabled) {
            flyway.clean()
        }

        flyway.migrate()
    }
}
