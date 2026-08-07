package at.wrk.tafel.admin.backend.modules.household.internal.masterdata

import at.wrk.tafel.admin.backend.common.pdf.PDFService
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
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.io.File
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import javax.imageio.ImageIO

class HouseholdPdfServiceTest {

    private lateinit var service: HouseholdPdfService
    private lateinit var testHousehold: HouseholdEntity

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

        service = HouseholdPdfService(PDFService())
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
}
