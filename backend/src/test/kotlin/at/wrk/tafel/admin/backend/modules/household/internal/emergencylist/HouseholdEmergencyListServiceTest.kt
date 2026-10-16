package at.wrk.tafel.admin.backend.modules.household.internal.emergencylist

import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import com.github.romankh3.image.comparison.ImageComparison
import com.github.romankh3.image.comparison.model.ImageComparisonState
import com.github.romankh3.image.comparison.model.Rectangle
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.spyk
import io.mockk.verify
import org.apache.commons.io.FileUtils
import org.apache.pdfbox.Loader
import org.apache.pdfbox.rendering.ImageType
import org.apache.pdfbox.rendering.PDFRenderer
import org.apache.pdfbox.text.PDFTextStripper
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import java.io.File
import java.time.Clock
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import javax.imageio.ImageIO

@ExtendWith(MockKExtension::class)
class HouseholdEmergencyListServiceTest {

    companion object {
        private val comparisonResultDirectory = File(
            System.getProperty("user.dir"),
            "build/custom-test-results/emergencylist-comparison-results",
        )
        private const val REFERENCES_PATH = "/pdf-references/household/emergencylist-references"

        @JvmStatic
        @BeforeAll
        fun beforeAll() {
            comparisonResultDirectory.mkdirs()
        }
    }

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var auditLogWriter: AuditLogWriter

    private val pdfService = spyk(PDFService())

    private val now = ZonedDateTime.of(2026, 10, 15, 7, 30, 0, 0, ZoneId.systemDefault())
    private val clock = Clock.fixed(now.toInstant(), ZoneId.systemDefault())

    private lateinit var service: HouseholdEmergencyListService

    @BeforeEach
    fun beforeEach() {
        service = HouseholdEmergencyListService(householdRepository, pdfService, auditLogWriter, clock)
    }

    private fun household(
        householdId: Long,
        lastname: String?,
        firstname: String?,
        additionalPersons: Int = 0,
        excludedPersons: Int = 0,
        locked: Boolean = false,
        lockedUntil: LocalDate? = null,
    ): HouseholdEntity {
        val household = HouseholdEntity(householdId = householdId, validUntil = LocalDate.of(2027, 3, 31), locked = locked)
        household.lockedUntil = lockedUntil
        val mainPerson = PersonEntity(household = household, country = testCountry1, isMainPerson = true).apply {
            this.lastname = lastname
            this.firstname = firstname
        }
        household.persons.add(mainPerson)
        household.mainPerson = mainPerson
        repeat(additionalPersons) {
            household.persons.add(PersonEntity(household = household, country = testCountry1))
        }
        repeat(excludedPersons) {
            household.persons.add(PersonEntity(household = household, country = testCountry1).apply { excludeFromHousehold = true })
        }
        return household
    }

    private fun testHouseholds() = listOf(
        household(101, "Mustermann", "Max", additionalPersons = 2, excludedPersons = 1),
        household(102, "Musterfrau", "Erika", locked = true),
        household(103, "Öztürk", "Ayşe", additionalPersons = 3, locked = true, lockedUntil = LocalDate.of(2026, 11, 30)),
        household(104, null, null),
    )

    @Test
    fun `lists the valid households sorted by number, with persons and lock`() {
        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), Sort.by("householdId")) } returns testHouseholds()
        val modelSlot = slot<Any>()
        every { pdfService.generatePdf(capture(modelSlot), any(), any(), any()) } returns ByteArray(0)

        val result = service.generateEmergencyListPdf()

        assertThat(result.filename).isEqualTo("notfallliste-2026-10-15.pdf")
        val model = modelSlot.captured as HouseholdEmergencyListPdfModel
        assertThat(model.subtitle).isEqualTo("Bezugsberechtigte Kunden, Stand 15.10.2026")
        assertThat(model.generatedAt).isEqualTo("15.10.2026 07:30")
        assertThat(model.countHouseholds).isEqualTo(4)
        assertThat(model.countPersons).isEqualTo(3 + 1 + 4 + 1)
        assertThat(model.households).containsExactly(
            HouseholdEmergencyListItem(101, "Mustermann Max", 3, "31.03.2027", null),
            HouseholdEmergencyListItem(102, "Musterfrau Erika", 1, "31.03.2027", "gesperrt"),
            HouseholdEmergencyListItem(103, "Öztürk Ayşe", 4, "31.03.2027", "gesperrt bis 30.11.2026"),
            HouseholdEmergencyListItem(104, "-", 1, "31.03.2027", null),
        )
    }

    @Test
    fun `records every generation as one bulk read`() {
        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), any<Sort>()) } returns testHouseholds()
        every { pdfService.generatePdf(any(), any(), any(), any()) } returns ByteArray(0)
        val entrySlot = slot<AuditLogWriter.PendingEntry>()

        service.generateEmergencyListPdf()

        verify(exactly = 1) { auditLogWriter.record(capture(entrySlot)) }
        assertThat(entrySlot.captured.entityType).isEqualTo(AuditScope.HOUSEHOLD_EMERGENCY_LIST_ENTITY_TYPE)
        assertThat(entrySlot.captured.operation).isEqualTo(AuditOperation.READ)
        assertThat(entrySlot.captured.businessKey).isEqualTo("4 Haushalte")
        assertThat(entrySlot.captured.entityId).isNull()
        assertThat(AuditScope.bulkReportEntityTypes).contains(AuditScope.HOUSEHOLD_EMERGENCY_LIST_ENTITY_TYPE)
    }

    @Test
    fun `an empty register still renders a list saying so`() {
        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), any<Sort>()) } returns emptyList()

        val result = service.generateEmergencyListPdf()

        Loader.loadPDF(result.bytes).use { document ->
            assertThat(PDFTextStripper().getText(document)).contains("Keine bezugsberechtigten Kunden")
        }
    }

    @Test
    fun `renders the list matching the reference`() {
        every { householdRepository.findAll(any<Specification<HouseholdEntity>>(), any<Sort>()) } returns testHouseholds()

        val pdfBytes = service.generateEmergencyListPdf().bytes
        FileUtils.writeByteArrayToFile(File(comparisonResultDirectory, "emergencylist-result.pdf"), pdfBytes)

        Loader.loadPDF(pdfBytes).use { document ->
            assertThat(document.numberOfPages).isEqualTo(1)
            val text = PDFTextStripper().getText(document)
            assertThat(text)
                .contains("Notfallliste")
                .contains("gesperrt bis 30.11.2026")
                .contains("nach dem Ausgabetag vernichten")
                .contains("Erstellt am 15.10.2026 07:30")

            // Written before the reference is read, so a new reference can be taken from here.
            val actualImage = PDFRenderer(document).renderImageWithDPI(0, 300f, ImageType.RGB)
            ImageIO.write(actualImage, "png", File(comparisonResultDirectory, "emergencylist-actual.png"))
            val expectedImage = ImageIO.read(javaClass.getResourceAsStream("$REFERENCES_PATH/emergencylist-actual.png"))
            ImageIO.write(expectedImage, "png", File(comparisonResultDirectory, "emergencylist-expected.png"))

            // The small-print footer's anti-aliasing differs by OS font rasterizer - see the same
            // exclusion in DistributionServiceTest's Kundenliste reference.
            val footerExclusionArea = Rectangle(0, actualImage.height - 400, actualImage.width, actualImage.height)
            val comparisonResult = ImageComparison(expectedImage, actualImage)
                .setExcludedAreas(listOf(footerExclusionArea))
                .compareImages()
            comparisonResult.writeResultTo(File(comparisonResultDirectory, "emergencylist-diff.png"))

            assertThat(comparisonResult.imageComparisonState).isEqualTo(ImageComparisonState.MATCH)
        }
    }
}
