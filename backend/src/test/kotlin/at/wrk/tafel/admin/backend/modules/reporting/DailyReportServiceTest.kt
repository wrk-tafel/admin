package at.wrk.tafel.admin.backend.modules.reporting

import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.logistics.testDistributionStatisticShelterEntity1
import at.wrk.tafel.admin.backend.modules.logistics.testDistributionStatisticShelterEntity2
import at.wrk.tafel.admin.backend.modules.reporting.internal.DailyReportPdfModel
import at.wrk.tafel.admin.backend.modules.reporting.internal.DailyReportShelterPdfModel
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.util.MimeTypeUtils
import java.math.BigDecimal
import java.time.format.DateTimeFormatter

@ExtendWith(MockKExtension::class)
internal class DailyReportServiceTest {

    @RelaxedMockK
    private lateinit var pdfService: PDFService

    @InjectMockKs
    private lateinit var service: DailyReportService

    @Test
    fun `generate daily report pdf`() {
        val statistic = DistributionStatisticEntity().apply {
            employeeCount = 100

            countCustomers = 1
            countPersons = 2
            countInfants = 3
            averagePersonsPerCustomer = BigDecimal("4.4")
            countCustomersNew = 5
            countPersonsNew = 6
            countCustomersProlonged = 7
            countPersonsProlonged = 8
            countCustomersUpdated = 9

            shopsTotalCount = 10
            shopsWithFoodCount = 11
            foodTotalAmount = BigDecimal(12)
            foodPerShopAverage = BigDecimal(13)
            routesLengthKm = 14

            shelters = listOf(
                testDistributionStatisticShelterEntity1,
                testDistributionStatisticShelterEntity2
            ).toMutableList()
        }

        every { pdfService.generatePdf(any(), any()) } returns ByteArray(0)

        val pdfBytes = service.generateDailyReportPdf(statistic)
        assertThat(pdfBytes).isNotNull

        val pdfModelSlot = slot<DailyReportPdfModel>()
        verify { pdfService.generatePdf(capture(pdfModelSlot), "/pdf-templates/daily-report/dailyreport-document.xsl") }

        val pdfModel = pdfModelSlot.captured
        assertThat(pdfModel).isNotNull
        assertThat(pdfModel.logoContentType).isEqualTo(MimeTypeUtils.IMAGE_PNG_VALUE)
        assertThat(pdfModel.logoBytes).isNotNull()

        val date = statistic.distribution?.startedAt?.toLocalDate()?.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))
        val startTime = statistic.distribution?.startedAt?.format(DateTimeFormatter.ofPattern("HH:mm"))
        val endTime = statistic.distribution?.endedAt?.format(DateTimeFormatter.ofPattern("HH:mm"))
        assertThat(pdfModel.date).isEqualTo("$date $startTime - $endTime")

        assertThat(pdfModel.employeeCount).isEqualTo(statistic.employeeCount)

        assertThat(pdfModel.countCustomers).isEqualTo(statistic.countCustomers)
        assertThat(pdfModel.countPersons).isEqualTo(statistic.countPersons)
        assertThat(pdfModel.countInfants).isEqualTo(statistic.countInfants)
        assertThat(pdfModel.averagePersonsPerCustomer).isEqualTo(statistic.averagePersonsPerCustomer)
        assertThat(pdfModel.countCustomersNew).isEqualTo(statistic.countCustomersNew)
        assertThat(pdfModel.countPersonsNew).isEqualTo(statistic.countPersonsNew)
        assertThat(pdfModel.countCustomersProlonged).isEqualTo(statistic.countCustomersProlonged)
        assertThat(pdfModel.countPersonsProlonged).isEqualTo(statistic.countPersonsProlonged)
        assertThat(pdfModel.countCustomersUpdated).isEqualTo(statistic.countCustomersUpdated)

        assertThat(pdfModel.shopsTotalCount).isEqualTo(statistic.shopsTotalCount)
        assertThat(pdfModel.shopsWithFoodCount).isEqualTo(statistic.shopsWithFoodCount)
        assertThat(pdfModel.foodTotalAmount).isEqualTo(statistic.foodTotalAmount)
        assertThat(pdfModel.foodPerShopAverage).isEqualTo(statistic.foodPerShopAverage)
        assertThat(pdfModel.routesLengthKm).isEqualTo(statistic.routesLengthKm)

        assertThat(pdfModel.personsInSheltersTotalCount).isEqualTo(3)

        val firstShelter = pdfModel.shelters[0]
        assertThat(firstShelter).isEqualTo(
            DailyReportShelterPdfModel(
                name = "Shelter 1",
                addressFormatted = "Street 1, Stiege A, Top 1, 1234 City 1",
                personCount = 1
            )
        )

        val secondShelter = pdfModel.shelters[1]
        assertThat(secondShelter).isEqualTo(
            DailyReportShelterPdfModel(
                name = "Shelter 2",
                addressFormatted = "Street 2, Stiege A, Top 2, 4321 City 2",
                personCount = 2
            )
        )
    }

}
