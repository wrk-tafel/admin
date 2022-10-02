package at.wrk.tafel.admin.backend.modules.customer.masterdata

import at.wrk.tafel.admin.backend.database.entities.CustomerAddPersonEntity
import at.wrk.tafel.admin.backend.database.entities.CustomerEntity
import com.github.romankh3.image.comparison.ImageComparison
import com.github.romankh3.image.comparison.model.ImageComparisonState
import org.apache.pdfbox.pdmodel.PDDocument
import org.apache.pdfbox.rendering.ImageType
import org.apache.pdfbox.rendering.PDFRenderer
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import javax.imageio.ImageIO

class CustomerPdfServiceImplTest {

    private lateinit var service: CustomerPdfServiceImpl
    private lateinit var testCustomer: CustomerEntity

    @BeforeEach
    fun beforeEach() {
        testCustomer = CustomerEntity()
        testCustomer.customerId = 123
        testCustomer.lastname = "Mustermann"
        testCustomer.firstname = "Max"
        testCustomer.birthDate = LocalDate.of(1980, 6, 10)
        testCustomer.incomeDue = LocalDate.of(2030, 1, 1)
        testCustomer.addressStreet = "Karl-Schäfer-Straße"
        testCustomer.addressHouseNumber = "8"
        testCustomer.addressStairway = "1"
        testCustomer.addressDoor = "3A"
        testCustomer.addressPostalCode = 1210
        testCustomer.addressCity = "Wien"
        testCustomer.employer = "WRK Team Österreich Tafel"

        val addPers1 = CustomerAddPersonEntity()
        addPers1.lastname = "Mustermann"
        addPers1.firstname = "Eva-Maria Magdalena"
        addPers1.birthDate = LocalDate.of(2000, 1, 1)
        addPers1.income = BigDecimal("1000")

        val addPers2 = CustomerAddPersonEntity()
        addPers2.lastname = "Mustermann"
        addPers2.firstname = "Max"
        addPers2.birthDate = LocalDate.of(2001, 12, 1)

        val addPers3 = CustomerAddPersonEntity()
        addPers3.lastname = "Mustermann"
        addPers3.firstname = "Maria"
        addPers3.birthDate = LocalDate.of(2005, 2, 28)
        addPers3.income = BigDecimal("132")

        testCustomer.additionalPersons = mutableListOf(addPers1, addPers2, addPers3)

        service = CustomerPdfServiceImpl()
    }

    @Test
    fun `generate masterdata pdf`() {
        val pdfBytes = service.generateMasterdataPdf(testCustomer)

        val document: PDDocument = PDDocument.load(pdfBytes)
        val pdfRenderer = PDFRenderer(document)
        val expectedImage = ImageIO.read(javaClass.getResourceAsStream("/pdf/master-references/masterdata.png"))
        val actualImage = pdfRenderer.renderImageWithDPI(0, 300f, ImageType.RGB)

        assertThat(document.numberOfPages).isEqualTo(1)
        val comparisonResult = ImageComparison(expectedImage, actualImage).compareImages()
        assertThat(comparisonResult.imageComparisonState).isEqualTo(ImageComparisonState.MATCH)

        document.close()
    }

    @Test
    fun `generate idcard pdf`() {
        val pdfBytes = service.generateIdCardPdf(testCustomer)

        val document: PDDocument = PDDocument.load(pdfBytes)
        val pdfRenderer = PDFRenderer(document)

        val expectedFirstPageImage = ImageIO.read(javaClass.getResourceAsStream("/pdf/master-references/idcard-page0.png"))
        val actualFirstPageImage = pdfRenderer.renderImageWithDPI(0, 300f, ImageType.RGB)

        val expectedSecondPageImage = ImageIO.read(javaClass.getResourceAsStream("/pdf/master-references/idcard-page1.png"))
        val actualSecondPageImage = pdfRenderer.renderImageWithDPI(1, 300f, ImageType.RGB)

        assertThat(document.numberOfPages).isEqualTo(2)

        val comparisonFirstPageResult = ImageComparison(expectedFirstPageImage, actualFirstPageImage).compareImages()
        assertThat(comparisonFirstPageResult.imageComparisonState).isEqualTo(ImageComparisonState.MATCH)

        val comparisonSecondPageResult = ImageComparison(expectedSecondPageImage, actualSecondPageImage).compareImages()
        assertThat(comparisonSecondPageResult.imageComparisonState).isEqualTo(ImageComparisonState.MATCH)

        document.close()
    }

    @Test
    fun `generate combined pdf`() {
        val pdfBytes = service.generateCombinedPdf(testCustomer)

        val document: PDDocument = PDDocument.load(pdfBytes)
        val pdfRenderer = PDFRenderer(document)

        val expectedFirstPageImage = ImageIO.read(javaClass.getResourceAsStream("/pdf/master-references/combined-page0.png"))
        val actualFirstPageImage = pdfRenderer.renderImageWithDPI(0, 300f, ImageType.RGB)


        val expectedSecondPageImage = ImageIO.read(javaClass.getResourceAsStream("/pdf/master-references/combined-page1.png"))
        val actualSecondPageImage = pdfRenderer.renderImageWithDPI(1, 300f, ImageType.RGB)

        assertThat(document.numberOfPages).isEqualTo(2)

        val comparisonFirstPageResult = ImageComparison(expectedFirstPageImage, actualFirstPageImage).compareImages()
        assertThat(comparisonFirstPageResult.imageComparisonState).isEqualTo(ImageComparisonState.MATCH)

        val comparisonSecondPageResult = ImageComparison(expectedSecondPageImage, actualSecondPageImage).compareImages()
        assertThat(comparisonSecondPageResult.imageComparisonState).isEqualTo(ImageComparisonState.MATCH)

        document.close()
    }

}
