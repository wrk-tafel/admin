package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.security.testUser
import at.wrk.tafel.admin.backend.security.testUserEntity
import at.wrk.tafel.admin.backend.security.testUserPermissions
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import jakarta.persistence.EntityNotFoundException
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
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
    fun `end distribution`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { distributionRepository.findById(distributionEntity.id!!) } returns Optional.of(distributionEntity)
        every { distributionRepository.save(any()) } returns mockk()

        service.endDistribution(distributionEntity.id!!)

        verify {
            distributionRepository.save(withArg {
                assertThat(it.endedAt).isBetween(ZonedDateTime.now().minusSeconds(1), ZonedDateTime.now())
            })
        }
    }

    @Test
    fun `end distribution but not found`() {
        every { distributionRepository.findById(any()) } returns Optional.empty()

        assertThrows(EntityNotFoundException::class.java) {
            service.endDistribution(123)
        }
    }

    @Test
    fun `current distribution found`() {
        val distributionEntity = DistributionEntity()
        distributionEntity.id = 123
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns Optional.of(
            distributionEntity
        )

        val distribution = service.getCurrentDistribution()

        assertThat(distribution!!.id).isEqualTo(distributionEntity.id)
    }

    @Test
    fun `current distribution not found`() {
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns Optional.empty()

        val distribution = service.getCurrentDistribution()

        assertThat(distribution).isNull()
    }

}
