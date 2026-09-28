package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdLockReason
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.jpa.domain.Specification
import java.time.Clock
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.Period
import java.time.ZoneId
import java.time.ZonedDateTime

@ExtendWith(MockKExtension::class)
class HouseholdLockReviewServiceTest {

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var auditLogWriter: AuditLogWriter

    private val properties = TafelAdminProperties().apply {
        householdLockReview.enabled = true
        householdLockReview.interval = Period.ofMonths(6)
    }

    private val now = ZonedDateTime.of(2026, 9, 28, 8, 0, 0, 0, ZoneId.systemDefault())
    private val clock = Clock.fixed(now.toInstant(), ZoneId.systemDefault())

    private lateinit var service: HouseholdLockReviewService

    @BeforeEach
    fun beforeEach() {
        service = HouseholdLockReviewService(householdRepository, userRepository, properties, auditLogWriter, clock)
    }

    private fun lockedHousehold(
        householdId: Long,
        lockedAt: LocalDateTime?,
        lockedUntil: LocalDate? = null,
        reviewedAt: LocalDateTime? = null,
    ) = HouseholdEntity(householdId = householdId, validUntil = LocalDate.of(2027, 1, 1), locked = true).apply {
        this.lockedAt = lockedAt
        this.lockedUntil = lockedUntil
        this.lockReviewedAt = reviewedAt
        lockReason = "Grund"
        lockReasonType = HouseholdLockReason.BANNED_FROM_PREMISES
    }

    @Test
    fun `dueCutoff is the interval before now`() {
        assertThat(service.dueCutoff()).isEqualTo(LocalDateTime.of(2026, 3, 28, 8, 0))
    }

    @Test
    fun `dueCutoff is null while the review is switched off`() {
        properties.householdLockReview.enabled = false
        assertThat(service.dueCutoff()).isNull()

        properties.householdLockReview.enabled = true
        properties.householdLockReview.interval = Period.ZERO
        assertThat(service.dueCutoff()).isNull()

        properties.householdLockReview.interval = Period.ofMonths(-1)
        assertThat(service.dueCutoff()).isNull()
    }

    @Test
    fun `marks only an open-ended lock older than the interval as due, oldest first`() {
        val neverReviewedOld = lockedHousehold(1, lockedAt = LocalDateTime.of(2025, 1, 10, 9, 0))
        val reviewedRecently = lockedHousehold(
            2,
            lockedAt = LocalDateTime.of(2024, 1, 10, 9, 0),
            reviewedAt = LocalDateTime.of(2026, 8, 1, 9, 0),
        )
        val reviewedLongAgo = lockedHousehold(
            3,
            lockedAt = LocalDateTime.of(2024, 1, 10, 9, 0),
            reviewedAt = LocalDateTime.of(2025, 6, 1, 9, 0),
        )
        val temporaryOld = lockedHousehold(4, lockedAt = LocalDateTime.of(2024, 1, 10, 9, 0), lockedUntil = LocalDate.of(2027, 1, 1))
        val neverStamped = lockedHousehold(5, lockedAt = null)
        every { householdRepository.findAll(any<Specification<HouseholdEntity>>()) } returns
            listOf(reviewedRecently, neverReviewedOld, temporaryOld, reviewedLongAgo, neverStamped)

        val result = service.getLockedHouseholds(page = null, pageSize = null, openEndedOnly = false, dueOnly = false)

        assertThat(result.items.map { it.householdId }).containsExactly(5, 4, 1, 3, 2)
        assertThat(result.items.associate { it.householdId to it.reviewDue })
            .containsEntry(1, true)
            .containsEntry(2, false)
            .containsEntry(3, true)
            .containsEntry(4, false)
            .containsEntry(5, true)
        assertThat(result.totalCount).isEqualTo(5)
    }

    @Test
    fun `nothing is due while the review is switched off`() {
        properties.householdLockReview.enabled = false
        every { householdRepository.findAll(any<Specification<HouseholdEntity>>()) } returns
            listOf(lockedHousehold(1, lockedAt = LocalDateTime.of(2020, 1, 1, 0, 0)))

        val result = service.getLockedHouseholds(page = null, pageSize = null, openEndedOnly = false, dueOnly = false)

        assertThat(result.items.single().reviewDue).isFalse()
    }

    @Test
    fun `slices the requested page`() {
        every { householdRepository.findAll(any<Specification<HouseholdEntity>>()) } returns
            (1L..7L).map { lockedHousehold(it, lockedAt = LocalDateTime.of(2026, 1, it.toInt(), 9, 0)) }

        val result = service.getLockedHouseholds(page = 2, pageSize = 5, openEndedOnly = false, dueOnly = false)

        assertThat(result.items.map { it.householdId }).containsExactly(6, 7)
        assertThat(result.totalCount).isEqualTo(7)
        assertThat(result.totalPages).isEqualTo(2)
        assertThat(result.currentPage).isEqualTo(2)
        assertThat(result.pageSize).isEqualTo(5)
    }

    @Test
    fun `every list call is recorded as a read`() {
        every { householdRepository.findAll(any<Specification<HouseholdEntity>>()) } returns emptyList()

        service.getLockedHouseholds(page = null, pageSize = null, openEndedOnly = true, dueOnly = true)

        val entry = slot<AuditLogWriter.PendingEntry>()
        verify { auditLogWriter.record(capture(entry)) }
        assertThat(entry.captured.entityType).isEqualTo(AuditScope.LOCKED_HOUSEHOLDS_ENTITY_TYPE)
        assertThat(entry.captured.operation).isEqualTo(AuditOperation.READ)
        assertThat(entry.captured.entityId).isNull()
        assertThat(entry.captured.businessKey).isEqualTo("openEndedOnly=true;dueOnly=true")
    }

    @Test
    fun `confirming a review stamps the time and the reviewer`() {
        val household = lockedHousehold(1, lockedAt = LocalDateTime.of(2025, 1, 10, 9, 0))
        val reviewer = mockk<UserEntity>()
        every { householdRepository.findByHouseholdId(1) } returns household
        every { userRepository.findByUsername("reviewer") } returns reviewer
        every { householdRepository.save(any<HouseholdEntity>()) } returns household

        service.confirmLockReview(1, "reviewer")

        assertThat(household.lockReviewedAt).isEqualTo(LocalDateTime.of(2026, 9, 28, 8, 0))
        assertThat(household.lockReviewedBy).isSameAs(reviewer)
        verify { householdRepository.save(household) }
    }

    @Test
    fun `confirming a review of an unknown household fails`() {
        every { householdRepository.findByHouseholdId(99) } returns null

        assertThatThrownBy { service.confirmLockReview(99, "reviewer") }.isInstanceOf(NotFoundException::class.java)
    }

    @Test
    fun `confirming a review of a household that is not locked fails`() {
        val household = HouseholdEntity(householdId = 1, validUntil = LocalDate.of(2027, 1, 1))
        every { householdRepository.findByHouseholdId(1) } returns household

        assertThatThrownBy { service.confirmLockReview(1, "reviewer") }.isInstanceOf(BusinessRuleException::class.java)
        verify(exactly = 0) { householdRepository.save(any()) }
    }
}
