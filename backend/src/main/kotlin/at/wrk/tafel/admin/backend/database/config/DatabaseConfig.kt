package at.wrk.tafel.admin.backend.database.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer
import org.springframework.boot.persistence.autoconfigure.EntityScan
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.jpa.repository.config.EnableJpaRepositories

@Configuration
@EnableJpaRepositories("at.wrk.tafel.admin.backend.database")
@EntityScan("at.wrk.tafel.admin.backend.database")
@ExcludeFromTestCoverage
class DatabaseConfig {

    companion object {
        private const val DEFAULT_BATCH_FETCH_SIZE_PROPERTY = "hibernate.default_batch_fetch_size"
        private const val BATCH_FETCH_SIZE = 100
    }

    /**
     * Loads the associations of a list of entities in a few `in (...)` selects rather than one select
     * per row - a page of households would otherwise cost a round trip per household for its persons,
     * its issuer and its main person, on a pooled connection held for all of them. Set here rather
     * than in `application.yml` because `src/test/resources/application.yml` replaces that file in
     * integration tests, which then wouldn't run with what production runs with.
     */
    @Bean
    fun batchFetchHibernatePropertiesCustomizer(): HibernatePropertiesCustomizer = HibernatePropertiesCustomizer { properties ->
        properties[DEFAULT_BATCH_FETCH_SIZE_PROPERTY] = BATCH_FETCH_SIZE
    }
}
