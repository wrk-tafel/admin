package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionCustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelException
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationFailedException
import at.wrk.tafel.admin.backend.modules.customer.testCustomerEntity1
import at.wrk.tafel.admin.backend.security.testUser
import at.wrk.tafel.admin.backend.security.testUserEntity
import at.wrk.tafel.admin.backend.security.testUserPermissions
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import java.time.ZonedDateTime
import java.util.*

@ExtendWith(MockKExtension::class)
internal class DistributionServiceTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var distributionCustomerRepository: DistributionCustomerRepository

    @RelaxedMockK
    private lateinit var customerRepository: CustomerRepository

    @InjectMockKs
    private lateinit var service: DistributionService

    private val authentication = TafelJwtAuthentication(
        tokenValue = "TOKEN",
        username = testUser.username,
        authorities = testUserPermissions.map { SimpleGrantedAuthority(it) }
    )

    @BeforeEach
    fun beforeEach() {
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `create new distribution`() {
        every { userRepository.findByUsername(authentication.username!!) } returns Optional.of(testUserEntity)
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns null

        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { distributionRepository.save(any()) } returns distributionEntity

        val distribution = service.createNewDistribution()

        assertThat(distribution).isEqualTo(distributionEntity)

        verify {
            distributionRepository.save(withArg {
                assertThat(it.startedAt).isBetween(ZonedDateTime.now().minusSeconds(1), ZonedDateTime.now())
                assertThat(it.endedAt).isNull()
                assertThat(it.startedByUser).isEqualTo(testUserEntity)
            })
        }
    }

    @Test
    fun `create new distribution with existing ongoing distribution`() {
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns testDistributionEntity

        val exception = assertThrows(TafelException::class.java) {
            service.createNewDistribution()
        }

        assertThat(exception.message).isEqualTo("Ausgabe bereits gestartet!")
    }

    @Test
    fun `current distribution found`() {
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns testDistributionEntity

        val distribution = service.getCurrentDistribution()

        assertThat(distribution!!.id).isEqualTo(testDistributionEntity.id)
    }

    @Test
    fun `current distribution not found`() {
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns null

        val distribution = service.getCurrentDistribution()

        assertThat(distribution).isNull()
    }

    @Test
    fun `get state list`() {
        val states = service.getStates()

        assertThat(states).isEqualTo(
            listOf(
                DistributionState.OPEN,
                DistributionState.CHECKIN,
                DistributionState.PAUSE,
                DistributionState.DISTRIBUTION,
                DistributionState.CLOSED
            )
        )
    }

    @Test
    fun `switch from open to next state`() {
        val distributionEntity = testDistributionEntity.apply { state = DistributionState.OPEN }
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity

        every { distributionRepository.save(any()) } returns mockk()

        service.switchToNextState(distributionEntity.state!!)

        verify {
            distributionRepository.save(withArg {
                assertThat(it.state).isEqualTo(DistributionState.CHECKIN)
            })
        }
    }

    @Test
    fun `switch to closed state`() {
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns testDistributionEntity
        every { distributionRepository.save(any()) } returns mockk()

        every { userRepository.findByUsername(authentication.username!!) } returns Optional.of(testUserEntity)

        service.switchToNextState(testDistributionEntity.state!!)

        verify {
            distributionRepository.save(withArg {
                assertThat(it.state).isEqualTo(DistributionState.CLOSED)
                assertThat(it.endedAt).isBetween(ZonedDateTime.now().minusSeconds(5), ZonedDateTime.now())
                assertThat(it.endedByUser).isEqualTo(testUserEntity)
            })
        }
    }

    @Test
    fun `assign customer when customer doesnt exist`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        val customerId = 1L
        val ticketNumber = 200

        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns testDistributionEntity
        every { customerRepository.findByCustomerId(customerId) } returns null

        val exception = assertThrows<TafelValidationFailedException> {
            service.assignCustomerToDistribution(
                distribution = distributionEntity,
                customerId = customerId,
                ticketNumber = ticketNumber
            )
        }

        assertThat(exception.message).isEqualTo("Kunde Nr. $customerId nicht vorhanden!")
    }

    @Test
    fun `assign customer successful`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        val customerId = 1L
        val ticketNumber = 200

        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns testDistributionEntity
        every { customerRepository.findByCustomerId(customerId) } returns testCustomerEntity1
        every { distributionCustomerRepository.save(any()) } returns mockk()

        service.assignCustomerToDistribution(
            distribution = distributionEntity,
            customerId = customerId,
            ticketNumber = ticketNumber
        )

        verify {
            distributionCustomerRepository.save(withArg {
                assertThat(it.customer).isEqualTo(testCustomerEntity1)
                assertThat(it.distribution).isEqualTo(testDistributionEntity)
                assertThat(it.ticketNumber).isEqualTo(ticketNumber)
            })
        }
    }

}
