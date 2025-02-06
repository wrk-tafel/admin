package at.wrk.tafel.admin.backend

import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.orm.jpa.AutoConfigureTestEntityManager
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers

@SpringBootTest
@AutoConfigureTestEntityManager
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class TafelBaseIntegrationTest {

    companion object {
        @Container
        @JvmStatic
        private val postgreSQLContainer: PostgreSQLContainer<*> = PostgreSQLContainer("postgres:16.1-bullseye")
            .withDatabaseName("tafeladmin")
            .withUsername("admin")
            .withPassword("admin")

        @DynamicPropertySource
        @JvmStatic
        fun dynamicDataSourceProperties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgreSQLContainer::jdbcUrl)
            registry.add("spring.datasource.username", postgreSQLContainer::username)
            registry.add("spring.datasource.password", postgreSQLContainer::password)
        }
    }

}
