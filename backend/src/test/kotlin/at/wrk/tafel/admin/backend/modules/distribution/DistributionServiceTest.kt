package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.common.model.DistributionStateTransitionEvent
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationFailedException
import at.wrk.tafel.admin.backend.security.testUser
import at.wrk.tafel.admin.backend.security.testUserEntity
import at.wrk.tafel.admin.backend.security.testUserPermissions
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.fail
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import org.springframework.statemachine.StateMachine
import org.springframework.statemachine.transition.Transition
import java.time.ZonedDateTime
import java.util.*

@ExtendWith(MockKExtension::class)
internal class DistributionServiceTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var stateMachine: StateMachine<DistributionState, DistributionStateTransitionEvent>

    @InjectMockKs
    private lateinit var service: DistributionService

    @Test
    fun `start distribution`() {
        val authentication = TafelJwtAuthentication(
            tokenValue = "TOKEN",
            username = testUser.username,
            authorities = testUserPermissions.map { SimpleGrantedAuthority(it) }
        )
        SecurityContextHolder.setContext(SecurityContextImpl(authentication))

        every { userRepository.findByUsername(authentication.username!!) } returns Optional.of(testUserEntity)
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns null

        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { distributionRepository.save(any()) } returns distributionEntity

        val distribution = service.startDistribution()

        assertThat(distribution).isEqualTo(distributionEntity)

        verify {
            distributionRepository.save(withArg {
                assertThat(it.startedAt).isBetween(ZonedDateTime.now().minusSeconds(1), ZonedDateTime.now())
                assertThat(it.endedAt).isNull()
                assertThat(it.startedByUser).isEqualTo(testUserEntity)
            })
        }

        SecurityContextHolder.clearContext()
    }

    @Test
    fun `start distribution with existing ongoing distribution`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity

        assertThrows(TafelValidationFailedException::class.java) {
            service.startDistribution()
        }
    }

    @Test
    fun `current distribution found`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns distributionEntity

        val distribution = service.getCurrentDistribution()

        assertThat(distribution!!.id).isEqualTo(distributionEntity.id)
    }

    @Test
    fun `current distribution not found`() {
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns null

        val distribution = service.getCurrentDistribution()

        assertThat(distribution).isNull()
    }

    @Test
    fun `get state list`() {
        val transitions = listOf<Transition<DistributionState, DistributionStateTransitionEvent>>()
        every { stateMachine.transitions } returns listOf()

        service.getStates()

        fail("TODO")
    }

}
