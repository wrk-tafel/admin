package at.wrk.tafel.admin.backend.modules.household.internal.masterdata

import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.Gender
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import com.github.romankh3.image.comparison.ImageComparison
import com.github.romankh3.image.comparison.model.ImageComparisonState
import org.apache.commons.io.FileUtils
import org.apache.pdfbox.Loader
import org.apache.pdfbox.pdmodel.PDDocument
import org.apache.pdfbox.rendering.ImageType
import org.apache.pdfbox.rendering.PDFRenderer
import org.apache.pdfbox.text.PDFTextStripper
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.io.File
import java.math.BigDecimal
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import javax.imageio.ImageIO

class HouseholdPdfServiceTest {

    private lateinit var service: HouseholdPdfService
    private lateinit var testHousehold: HouseholdEntity

    // Matches TafelAdminHouseholdRetentionProperties' own default, and what the checked-in golden
    // reference images below were rendered with.
    private val tafelAdminProperties = TafelAdminProperties()

    // Fixed so generatePrivacyNoticePdf's "Ort, Datum" (LocalDate.now(clock)) doesn't drift a day
    // past midnight and mismatch the checked-in golden reference image below.
    private val clock: Clock = Clock.fixed(Instant.parse("2026-01-15T10:00:00Z"), ZoneId.of("UTC"))

    companion object {
        private val comparisonResultDirectory = File(
            System.getProperty("user.dir"),
            "build/custom-test-results/customerpdf-comparison-results",
        )

        private const val MASTER_REFERENCES_PATH = "/pdf-references/customer/master-references"

        @JvmStatic
        @BeforeAll
        fun beforeAll() {
            comparisonResultDirectory.mkdirs()
        }
    }

    @BeforeEach
    fun beforeEach() {
        val testUserEntity = UserEntity(
            username = "test-username",
            password = "pwd",
            employee = EmployeeEntity(personnelNumber = "0000", firstname = "First", lastname = "Last"),
            enabled = true,
        ).apply { id = 0 }

        testHousehold = HouseholdEntity(householdId = 123, validUntil = LocalDate.of(2030, 3, 1))
        testHousehold.createdAt = LocalDateTime.of(
            LocalDate.of(2022, 10, 3),
            LocalTime.of(10, 10),
        )
        testHousehold.issuer = testUserEntity.employee
        testHousehold.addressStreet = "Karl-Schäfer-Straße"
        testHousehold.addressHouseNumber = "8"
        testHousehold.addressStairway = "1"
        testHousehold.addressDoor = "3A"
        testHousehold.addressPostalCode = 1210
        testHousehold.addressCity = "Wien"

        val mainPerson = PersonEntity(household = testHousehold, country = testCountry1, isMainPerson = true)
        mainPerson.lastname = "Mustermann"
        mainPerson.firstname = "Max"
        mainPerson.birthDate = LocalDate.of(1980, 6, 10)
        mainPerson.gender = Gender.FEMALE
        mainPerson.employer = "WRK Team Österreich Tafel"
        mainPerson.income = BigDecimal("977.94587")
        mainPerson.incomeDue = LocalDate.of(2030, 1, 1)

        val addPers1 = PersonEntity(household = testHousehold, country = testCountry1)
        addPers1.lastname = "Mustermann"
        addPers1.firstname = "Eva-Maria Magdalena"
        addPers1.birthDate = LocalDate.of(2000, 1, 1)
        addPers1.gender = Gender.MALE
        addPers1.income = BigDecimal("1000")
        addPers1.excludeFromHousehold = false

        val addPers2 = PersonEntity(household = testHousehold, country = testCountry1)
        addPers2.lastname = "Mustermann"
        addPers2.firstname = "Max"
        addPers2.birthDate = LocalDate.of(2001, 12, 1)
        addPers2.excludeFromHousehold = false

        val addPers3 = PersonEntity(household = testHousehold, country = testCountry1)
        addPers3.lastname = "Mustermann"
        addPers3.firstname = "Maria"
        addPers3.birthDate = LocalDate.of(2005, 2, 28)
        addPers3.income = BigDecimal("132")
        addPers3.excludeFromHousehold = true

        testHousehold.persons = mutableListOf(mainPerson, addPers1, addPers2, addPers3)
        testHousehold.mainPerson = mainPerson

        service = HouseholdPdfService(PDFService(), clock, tafelAdminProperties)
    }

    @Test
    fun `generate masterdata pdf`() {
        val pdfBytes = service.generateMasterdataPdf(testHousehold)
        FileUtils.writeByteArrayToFile(File(comparisonResultDirectory, "masterdata-result.pdf"), pdfBytes)

        val document: PDDocument = Loader.loadPDF(pdfBytes)
        val pdfRenderer = PDFRenderer(document)

        assertThat(document.numberOfPages).isEqualTo(1)

        val expectedImage = ImageIO.read(javaClass.getResourceAsStream("$MASTER_REFERENCES_PATH/masterdata-actual.png"))
        ImageIO.write(expectedImage, "png", File(comparisonResultDirectory, "masterdata-expected.png"))
        val actualImage = pdfRenderer.renderImageWithDPI(0, 300f, ImageType.RGB)
        ImageIO.write(actualImage, "png", File(comparisonResultDirectory, "masterdata-actual.png"))

        val comparisonResult = ImageComparison(expectedImage, actualImage).compareImages()
        comparisonResult.writeResultTo(File(comparisonResultDirectory, "masterdata-diff.png"))

        assertThat(comparisonResult.imageComparisonState).isEqualTo(ImageComparisonState.MATCH)

        document.close()
    }

    @Test
    fun `generate idcard pdf`() {
        val pdfBytes = service.generateIdCardPdf(testHousehold)
        FileUtils.writeByteArrayToFile(File(comparisonResultDirectory, "idcard-result.pdf"), pdfBytes)

        val document: PDDocument = Loader.loadPDF(pdfBytes)
        val pdfRenderer = PDFRenderer(document)

        assertThat(document.numberOfPages).isEqualTo(2)

        val expectedFirstPageImage =
            ImageIO.read(javaClass.getResourceAsStream("$MASTER_REFERENCES_PATH/idcard-page0-actual.png"))
        ImageIO.write(expectedFirstPageImage, "png", File(comparisonResultDirectory, "idcard-page0-expected.png"))
        val actualFirstPageImage = pdfRenderer.renderImageWithDPI(0, 300f, ImageType.RGB)
        ImageIO.write(actualFirstPageImage, "png", File(comparisonResultDirectory, "idcard-page0-actual.png"))

        val expectedSecondPageImage =
            ImageIO.read(javaClass.getResourceAsStream("$MASTER_REFERENCES_PATH/idcard-page1-actual.png"))
        ImageIO.write(expectedSecondPageImage, "png", File(comparisonResultDirectory, "idcard-page1-expected.png"))
        val actualSecondPageImage = pdfRenderer.renderImageWithDPI(1, 300f, ImageType.RGB)
        ImageIO.write(actualSecondPageImage, "png", File(comparisonResultDirectory, "idcard-page1-actual.png"))

        val comparisonFirstPageResult = ImageComparison(expectedFirstPageImage, actualFirstPageImage).compareImages()
        comparisonFirstPageResult.writeResultTo(File(comparisonResultDirectory, "idcard-page0-diff.png"))
        val comparisonSecondPageResult = ImageComparison(expectedSecondPageImage, actualSecondPageImage).compareImages()
        comparisonSecondPageResult.writeResultTo(File(comparisonResultDirectory, "idcard-page1-diff.png"))

        assertThat(comparisonFirstPageResult.imageComparisonState).isEqualTo(ImageComparisonState.MATCH)
        assertThat(comparisonSecondPageResult.imageComparisonState).isEqualTo(ImageComparisonState.MATCH)

        document.close()
    }

    @Test
    fun `generate privacy notice pdf`() {
        val pdfBytes = service.generatePrivacyNoticePdf(testHousehold)
        FileUtils.writeByteArrayToFile(File(comparisonResultDirectory, "privacynotice-result.pdf"), pdfBytes)

        val document: PDDocument = Loader.loadPDF(pdfBytes)
        val pdfRenderer = PDFRenderer(document)

        // The consent statement and signature line spill onto a second page now that the notice
        // covers the full Art. 13 disclosure set (GDPR gap G20, issue #3429) - only page 0 is
        // rendered/compared below, same as before.
        assertThat(document.numberOfPages).isEqualTo(2)

        val expectedImage = ImageIO.read(javaClass.getResourceAsStream("$MASTER_REFERENCES_PATH/privacynotice-actual.png"))
        ImageIO.write(expectedImage, "png", File(comparisonResultDirectory, "privacynotice-expected.png"))
        val actualImage = pdfRenderer.renderImageWithDPI(0, 300f, ImageType.RGB)
        ImageIO.write(actualImage, "png", File(comparisonResultDirectory, "privacynotice-actual.png"))

        val comparisonResult = ImageComparison(expectedImage, actualImage).compareImages()
        comparisonResult.writeResultTo(File(comparisonResultDirectory, "privacynotice-diff.png"))

        assertThat(comparisonResult.imageComparisonState).isEqualTo(ImageComparisonState.MATCH)

        // The footer's page number/generation-date stamp (issue #3429 follow-up) - fo:static-content
        // repeats it on every page, so this checks each page individually.
        for (page in 1..document.numberOfPages) {
            val stripper = PDFTextStripper().apply {
                startPage = page
                endPage = page
            }
            assertThat(stripper.getText(document)).contains("Erstellt am 15.01.2026 · Seite $page von 2")
        }

        document.close()
    }

    @Test
    fun `generate privacy notice pdf - falls back to persons list when mainPerson pointer is unset`() {
        // saveWithMainPerson persists a brand-new household with mainPerson = null first (see
        // HouseholdService) - generatePrivacyNoticePdf has to resolve the main person from persons
        // the same way createHouseholdPdfData already does.
        testHousehold.mainPerson = null

        val document = Loader.loadPDF(service.generatePrivacyNoticePdf(testHousehold))
        assertThat(document.numberOfPages).isEqualTo(2)
        assertThat(PDFTextStripper().getText(document)).contains("Max Mustermann")
        document.close()
    }

    @Test
    fun `generate privacy notice pdf - falls back to placeholder name when there is no main person at all`() {
        testHousehold.mainPerson = null
        testHousehold.persons = mutableListOf()

        val document = Loader.loadPDF(service.generatePrivacyNoticePdf(testHousehold))
        assertThat(document.numberOfPages).isEqualTo(2)
        document.close()
    }

    @Test
    fun `generate privacy notice template pdf - no household reference`() {
        val pdfBytes = service.generatePrivacyNoticeTemplatePdf()
        FileUtils.writeByteArrayToFile(File(comparisonResultDirectory, "privacynotice-template-result.pdf"), pdfBytes)

        val document: PDDocument = Loader.loadPDF(pdfBytes)
        val pdfRenderer = PDFRenderer(document)

        assertThat(document.numberOfPages).isEqualTo(2)
        // Neither a "Kundennummer" line nor a name/date leak in - see privacy-notice.xsl.
        assertThat(PDFTextStripper().getText(document)).doesNotContain("Kundennummer")

        val expectedImage = ImageIO.read(javaClass.getResourceAsStream("$MASTER_REFERENCES_PATH/privacynotice-template-actual.png"))
        ImageIO.write(expectedImage, "png", File(comparisonResultDirectory, "privacynotice-template-expected.png"))
        val actualImage = pdfRenderer.renderImageWithDPI(0, 300f, ImageType.RGB)
        ImageIO.write(actualImage, "png", File(comparisonResultDirectory, "privacynotice-template-actual.png"))

        val comparisonResult = ImageComparison(expectedImage, actualImage).compareImages()
        comparisonResult.writeResultTo(File(comparisonResultDirectory, "privacynotice-template-diff.png"))

        assertThat(comparisonResult.imageComparisonState).isEqualTo(ImageComparisonState.MATCH)

        // Blank template or not, the footer stamp is always populated (issue #3429 follow-up) - see
        // PrivacyNoticePdfData.generatedAt's KDoc for why it's separate from issuedAtDate here.
        for (page in 1..document.numberOfPages) {
            val stripper = PDFTextStripper().apply {
                startPage = page
                endPage = page
            }
            assertThat(stripper.getText(document)).contains("Erstellt am 15.01.2026 · Seite $page von 2")
        }

        document.close()
    }
}
