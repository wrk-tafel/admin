package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.modules.base.events.DistributionClosedEvent
import at.wrk.tafel.admin.backend.modules.distribution.service.internal.DistributionInternalService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.modulith.test.ApplicationModuleTest
import org.springframework.modulith.test.AssertablePublishedEvents

@ApplicationModuleTest
class DistributionModuleIT {

    @Autowired
    private lateinit var service: DistributionInternalService

    @Test
    fun closeDistribution(events: AssertablePublishedEvents) {
        val distribution = service.createNewDistribution()

        service.closeDistribution()

        assertThat(events)
            .contains(DistributionClosedEvent::class.java)
            .matching(DistributionClosedEvent::distributionId, distribution.id)
    }

}
