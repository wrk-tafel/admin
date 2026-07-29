package at.wrk.tafel.admin.backend.database.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.boot.persistence.autoconfigure.EntityScan
import org.springframework.context.annotation.Configuration
import org.springframework.data.jpa.repository.config.EnableJpaRepositories

@Configuration
@EnableJpaRepositories("at.wrk.tafel.admin.backend.database")
@EntityScan(
    // The second package is spring-modulith-starter-jpa's own event publication registry entities
    // (DefaultJpaEventPublication / ArchivedJpaEventPublication). It self-registers as an
    // auto-configuration package so a default (no explicit @EntityScan) app would pick it up, but an
    // explicit @EntityScan like this one replaces that default entirely, so it has to be listed here too -
    // see R__00079_add_event_publication.sql for the matching schema.
    "at.wrk.tafel.admin.backend.database",
    "org.springframework.modulith.events.jpa",
)
@ExcludeFromTestCoverage
class DatabaseConfig
