package at.wrk.tafel.admin.backend.dbmodel.config

import org.springframework.context.annotation.Configuration
import org.springframework.data.jpa.repository.config.EnableJpaRepositories

@Configuration
@EnableJpaRepositories("at.wrk.tafel.admin.backend")
class DatabaseConfig
