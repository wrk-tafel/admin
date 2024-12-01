package at.wrk.tafel.admin.backend.modules.customer.internal.masterdata

import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.Gender
import at.wrk.tafel.admin.backend.database.model.customer.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.model.customer.CustomerEntity
import at.wrk.tafel.admin.backend.modules.base.country.testCountry
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
import org.testcontainers.shaded.org.apache.commons.lang3.SystemUtils
import java.io.File
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import javax.imageio.ImageIO

class CustomerPdfServiceTest {

    private lateinit var service: CustomerPdfService
    private lateinit var testCustomer: CustomerEntity
    private lateinit var testCustomerMinimal: CustomerEntity

    companion object {
        private val comparisonResultDirectory = File(
            System.getProperty("user.dir"), "target/custom-test-results/customerpdf-comparison-results"
        )

        private var masterReferencesPath = "/pdf-references/customer/master-references/"

        @JvmStatic
        @BeforeAll
        fun beforeAll() {
            comparisonResultDirectory.mkdirs()

            // TODO improve pdfbox rendering to be system-independent
            /* pdfbox currently uses a different font on linux to render the pdf-pages to images.
               Therefore, the image comparison fails.
               So this is a workaround currently while there are the following possible improvements:
               - Bigger tolerance level in the ImageComparison
               --> setAllowingPercentOfDifferentPixels(40.0) but allowing 40% makes it also kind of obsolete
               - Installing correct fonts in the linux pipeline (but also a different font in production)
               - Find an OS-independent font
             */
            if (SystemUtils.IS_OS_WINDOWS) {
                masterReferencesPath += "windows"
            } else if (SystemUtils.IS_OS_LINUX) {
                masterReferencesPath += "linux"
            }
        }
    }

    @BeforeEach
    fun beforeEach() {
        val testUserEntity = UserEntity()
        testUserEntity.username = "test-username"
        testUserEntity.password = null
        testUserEntity.enabled = true
        testUserEntity.id = 0
        testUserEntity.employee = EmployeeEntity().apply {
            personnelNumber = "0000"
            firstname = "First"
            lastname = "Last"
        }

        testCustomer = CustomerEntity()
        testCustomer.createdAt = LocalDateTime.of(
            LocalDate.of(2022, 10, 3), LocalTime.of(10, 10)
        )
        testCustomer.customerId = 123
        testCustomer.issuer = testUserEntity.employee
        testCustomer.lastname = "Mustermann"
        testCustomer.firstname = "Max"
        testCustomer.birthDate = LocalDate.of(1980, 6, 10)
        testCustomer.gender = Gender.FEMALE
        testCustomer.addressStreet = "Karl-Schäfer-Straße"
        testCustomer.addressHouseNumber = "8"
        testCustomer.addressStairway = "1"
        testCustomer.addressDoor = "3A"
        testCustomer.addressPostalCode = 1210
        testCustomer.addressCity = "Wien"
        testCustomer.employer = "WRK Team Österreich Tafel"
        testCustomer.income = BigDecimal("977.94587")
        testCustomer.incomeDue = LocalDate.of(2030, 1, 1)
        testCustomer.validUntil = LocalDate.of(2030, 3, 1)
        testCustomer.country = testCountry

        val addPers1 = CustomerAddPersonEntity()
        addPers1.lastname = "Mustermann"
        addPers1.firstname = "Eva-Maria Magdalena"
        addPers1.birthDate = LocalDate.of(2000, 1, 1)
        addPers1.gender = Gender.MALE
        addPers1.income = BigDecimal("1000")
        addPers1.country = testCountry
        addPers1.excludeFromHousehold = false

        val addPers2 = CustomerAddPersonEntity()
        addPers2.lastname = "Mustermann"
        addPers2.firstname = "Max"
        addPers2.birthDate = LocalDate.of(2001, 12, 1)
        addPers2.country = testCountry
        addPers2.excludeFromHousehold = false

        val addPers3 = CustomerAddPersonEntity()
        addPers3.lastname = "Mustermann"
        addPers3.firstname = "Maria"
        addPers3.birthDate = LocalDate.of(2005, 2, 28)
        addPers3.income = BigDecimal("132")
        addPers3.country = testCountry
        addPers3.excludeFromHousehold = true

        testCustomer.additionalPersons = mutableListOf(addPers1, addPers2, addPers3)

        testCustomerMinimal = CustomerEntity()
        testCustomerMinimal.createdAt = LocalDateTime.of(
            LocalDate.of(2022, 10, 3), LocalTime.of(10, 10)
        )
        testCustomerMinimal.customerId = 456
        testCustomerMinimal.lastname = "Mustermann"
        testCustomerMinimal.firstname = "Max"
        testCustomerMinimal.birthDate = LocalDate.of(1980, 6, 10)
        testCustomerMinimal.addressStreet = "Karl-Schäfer-Straße"
        testCustomerMinimal.addressCity = "Wien"
        testCustomerMinimal.employer = "WRK Team Österreich Tafel"
        testCustomerMinimal.income = BigDecimal("977.94587")
        testCustomerMinimal.incomeDue = LocalDate.of(2030, 1, 1)
        testCustomerMinimal.validUntil = LocalDate.of(2030, 3, 1)
        testCustomerMinimal.country = testCountry

        service = CustomerPdfService(PDFService())
    }

    @Test
    fun `generate masterdata pdf`() {
        val pdfBytes = service.generateMasterdataPdf(testCustomer)
        FileUtils.writeByteArrayToFile(File(comparisonResultDirectory, "masterdata-result.pdf"), pdfBytes)

        val document: PDDocument = Loader.loadPDF(pdfBytes)
        val pdfRenderer = PDFRenderer(document)

        assertThat(document.numberOfPages).isEqualTo(1)

        val expectedImage = ImageIO.read(javaClass.getResourceAsStream("$masterReferencesPath/masterdata-actual.png"))
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
        val pdfBytes = service.generateIdCardPdf(testCustomer)
        FileUtils.writeByteArrayToFile(File(comparisonResultDirectory, "idcard-result.pdf"), pdfBytes)

        val document: PDDocument = Loader.loadPDF(pdfBytes)
        val pdfRenderer = PDFRenderer(document)

        assertThat(document.numberOfPages).isEqualTo(2)

        val expectedFirstPageImage =
            ImageIO.read(javaClass.getResourceAsStream("$masterReferencesPath/idcard-page0-actual.png"))
        ImageIO.write(expectedFirstPageImage, "png", File(comparisonResultDirectory, "idcard-page0-expected.png"))
        val actualFirstPageImage = pdfRenderer.renderImageWithDPI(0, 300f, ImageType.RGB)
        ImageIO.write(actualFirstPageImage, "png", File(comparisonResultDirectory, "idcard-page0-actual.png"))

        val expectedSecondPageImage =
            ImageIO.read(javaClass.getResourceAsStream("$masterReferencesPath/idcard-page1-actual.png"))
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
    fun `generate combined pdf`() {
        val pdfBytes = service.generateCombinedPdf(testCustomer)
        FileUtils.writeByteArrayToFile(File(comparisonResultDirectory, "combined-result.pdf"), pdfBytes)

        val document: PDDocument = Loader.loadPDF(pdfBytes)
        val pdfRenderer = PDFRenderer(document)

        assertThat(document.numberOfPages).isEqualTo(2)

        val expectedFirstPageImage =
            ImageIO.read(javaClass.getResourceAsStream("$masterReferencesPath/combined-page0-actual.png"))
        ImageIO.write(expectedFirstPageImage, "png", File(comparisonResultDirectory, "combined-page0-expected.png"))
        val actualFirstPageImage = pdfRenderer.renderImageWithDPI(0, 300f, ImageType.RGB)
        ImageIO.write(actualFirstPageImage, "png", File(comparisonResultDirectory, "combined-page0-actual.png"))

        val expectedSecondPageImage =
            ImageIO.read(javaClass.getResourceAsStream("$masterReferencesPath/combined-page1-actual.png"))
        ImageIO.write(expectedSecondPageImage, "png", File(comparisonResultDirectory, "combined-page1-expected.png"))
        val actualSecondPageImage = pdfRenderer.renderImageWithDPI(1, 300f, ImageType.RGB)
        ImageIO.write(actualSecondPageImage, "png", File(comparisonResultDirectory, "combined-page1-actual.png"))

        val comparisonFirstPageResult = ImageComparison(expectedFirstPageImage, actualFirstPageImage).compareImages()
        comparisonFirstPageResult.writeResultTo(File(comparisonResultDirectory, "combined-page0-diff.png"))
        val comparisonSecondPageResult = ImageComparison(expectedSecondPageImage, actualSecondPageImage).compareImages()
        comparisonSecondPageResult.writeResultTo(File(comparisonResultDirectory, "combined-page1-diff.png"))

        assertThat(comparisonFirstPageResult.imageComparisonState).isEqualTo(ImageComparisonState.MATCH)
        assertThat(comparisonSecondPageResult.imageComparisonState).isEqualTo(ImageComparisonState.MATCH)

        document.close()
    }

    @Test
    fun `generate combined pdf with minimal data`() {
        val pdfBytes = service.generateCombinedPdf(testCustomerMinimal)
        FileUtils.writeByteArrayToFile(File(comparisonResultDirectory, "combined-result.pdf"), pdfBytes)

        val document: PDDocument = Loader.loadPDF(pdfBytes)
        assertThat(document.numberOfPages).isEqualTo(2)
        document.close()
    }

}
