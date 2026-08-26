package at.wrk.tafel.admin.backend

import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase
import org.springframework.boot.jpa.test.autoconfigure.AutoConfigureTestEntityManager
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.postgresql.PostgreSQLContainer

@SpringBootTest
@AutoConfigureTestEntityManager
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class TafelBaseIntegrationTest {

    companion object {
        // Singleton container pattern: started once for the whole JVM/test run and never stopped by JUnit,
        // so it stays valid for every subclass. Using @Container/@Testcontainers here would stop it after each
        // test class, while Spring's ApplicationContext cache keeps reusing the (now stale) datasource config
        // across classes, causing "connection refused" once a second IT class runs.
        private val postgreSQLContainer: PostgreSQLContainer = PostgreSQLContainer(TEST_POSTGRES_IMAGE)
            .withDatabaseName("tafeladmin")
            .withUsername("admin")
            .withPassword("admin")
            .apply { start() }

        @DynamicPropertySource
        @JvmStatic
        fun dynamicDataSourceProperties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgreSQLContainer::getJdbcUrl)
            registry.add("spring.datasource.username", postgreSQLContainer::getUsername)
            registry.add("spring.datasource.password", postgreSQLContainer::getPassword)
        }
    }
}
