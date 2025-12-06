package at.wrk.tafel.admin.backend.database.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.boot.persistence.autoconfigure.EntityScan
import org.springframework.context.annotation.Configuration
import org.springframework.data.jpa.repository.config.EnableJpaRepositories

@Configuration
@EnableJpaRepositories("at.wrk.tafel.admin.backend.database")
@EntityScan("at.wrk.tafel.admin.backend.database")
@ExcludeFromTestCoverage
class DatabaseConfig
