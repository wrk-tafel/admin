package at.wrk.tafel.admin.backend.database.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.flywaydb.core.Flyway
import org.flywaydb.core.api.callback.Callback
import org.springframework.context.ApplicationContext
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import javax.sql.DataSource

@Configuration
@ExcludeFromTestCoverage
class FlywayConfig {

    @Bean
    fun flyway(dataSource: DataSource, applicationContext: ApplicationContext): Flyway {
        val callbacks = applicationContext.getBeansOfType(Callback::class.java).values

        return Flyway.configure()
            .dataSource(dataSource)
            .locations("classpath:/db-migration")
            .group(true)
            .ignoreMigrationPatterns("*:missing")
            .baselineOnMigrate(true)
            .callbacks(*callbacks.toTypedArray())
            .cleanDisabled(false)
            .load()
    }

}
