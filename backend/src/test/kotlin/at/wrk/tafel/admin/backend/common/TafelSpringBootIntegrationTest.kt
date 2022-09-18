package at.wrk.tafel.admin.backend.common

import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers

// TODO use or delete it
// or per config
//   datasource:
//    driver-class-name: org.testcontainers.jdbc.ContainerDatabaseDriver
//    jdbc-url: jdbc:tc:postgresql:14.0:///tafeladmin
@SpringBootTest
@Testcontainers
class TafelSpringBootIntegrationTest {

    companion object {
        @Container
        @JvmStatic
        private val postgreSQLContainer: PostgreSQLContainer<*> = PostgreSQLContainer("postgres:14.0")
            .withDatabaseName("tafeladmin")
            .withUsername("admin")
            .withPassword("admin")

        @DynamicPropertySource
        @JvmStatic
        fun dynamicDataSourceProperties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgreSQLContainer::getJdbcUrl)
            registry.add("spring.datasource.username", postgreSQLContainer::getUsername)
            registry.add("spring.datasource.password", postgreSQLContainer::getPassword)
        }
    }

}
