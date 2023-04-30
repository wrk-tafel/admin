package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionCustomerEntity
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionCustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import java.time.ZonedDateTime

@Service
class DistributionService(
    private val distributionRepository: DistributionRepository,
    private val userRepository: UserRepository,
    private val distributionCustomerRepository: DistributionCustomerRepository,
    private val customerRepository: CustomerRepository
) {
    private val STATES_LIST = listOf(
        DistributionState.OPEN,
        DistributionState.CHECKIN,
        DistributionState.PAUSE,
        DistributionState.DISTRIBUTION,
        DistributionState.CLOSED
    )

    fun createNewDistribution(): DistributionEntity {
        val currentDistribution = distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()
        if (currentDistribution != null) {
            throw TafelException("Ausgabe bereits gestartet!")
        }

        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

        val distribution = DistributionEntity()
        distribution.startedAt = ZonedDateTime.now()
        distribution.startedByUser = userRepository.findByUsername(authenticatedUser.username!!).get()
        distribution.state = DistributionState.OPEN

        return distributionRepository.save(distribution)
    }

    fun getCurrentDistribution(): DistributionEntity? {
        return distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()
    }

    fun getStates(): List<DistributionState> {
        return STATES_LIST
    }

    fun switchToNextState(currentState: DistributionState) {
        val nextState = STATES_LIST[STATES_LIST.indexOf(currentState) + 1]
        saveStateToDistribution(nextState)
    }

    private fun saveStateToDistribution(nextState: DistributionState) {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

        val distribution = distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()
        if (distribution != null) {
            distribution.state = nextState
            if (nextState == DistributionState.CLOSED) {
                distribution.endedAt = ZonedDateTime.now()
                distribution.endedByUser = userRepository.findByUsername(authenticatedUser.username!!).get()
            }
            distributionRepository.save(distribution)
        }
    }

    fun assignCustomerToDistribution(distribution: DistributionEntity, customerId: Long, ticketNumber: Int) {
        val customer = customerRepository.findByCustomerId(customerId)
            ?: throw TafelException("Kunde nicht vorhanden!")

        val entry = DistributionCustomerEntity()
        entry.distribution = distribution
        entry.customer = customer
        entry.ticketNumber = ticketNumber

        try {
            distributionCustomerRepository.save(entry)
        } catch (e: DataIntegrityViolationException) {
            throw TafelException("Kunde ist bereits zugewiesen!")
        }
    }

}
