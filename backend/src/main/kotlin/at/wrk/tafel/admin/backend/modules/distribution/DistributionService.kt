package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionRepository
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import java.time.ZonedDateTime

@Service
class DistributionService(
    private val distributionRepository: DistributionRepository,
    private val userRepository: UserRepository
) {

    fun startDistribution() {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

        val distribution = DistributionEntity()
        distribution.startedAt = ZonedDateTime.now()
        distribution.startedByUser = userRepository.findByUsername(authenticatedUser.username!!).orElse(null)

        distributionRepository.save(distribution)
    }

    fun endDistribution() {
        val latestDistribution = distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()

        latestDistribution.endedAt = ZonedDateTime.now()

        distributionRepository.save(latestDistribution)
    }

}
