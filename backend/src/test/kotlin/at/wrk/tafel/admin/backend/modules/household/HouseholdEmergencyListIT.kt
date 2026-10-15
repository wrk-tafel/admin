package at.wrk.tafel.admin.backend.modules.household

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogRepository
import org.apache.pdfbox.Loader
import org.apache.pdfbox.text.PDFTextStripper
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.test.context.support.WithMockUser

/**
 * The "Notfallliste" needs `CUSTOMER` *and* `CUSTOMER_EMERGENCY_LIST` - checked against the real
 * method security, since `HouseholdControllerTest` calls the controller without it - and leaves an
 * entry in the audit trail once its transaction commits.
 */
class HouseholdEmergencyListIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var householdController: HouseholdController

    @Autowired
    private lateinit var auditLogRepository: AuditLogRepository

    @Test
    @WithMockUser(authorities = ["CUSTOMER"])
    fun `CUSTOMER alone is not enough`() {
        assertThrows<AccessDeniedException> { householdController.generateEmergencyListPdf() }
    }

    @Test
    @WithMockUser(authorities = ["CUSTOMER_EMERGENCY_LIST"])
    fun `CUSTOMER_EMERGENCY_LIST alone is not enough`() {
        assertThrows<AccessDeniedException> { householdController.generateEmergencyListPdf() }
    }

    @Test
    @WithMockUser(username = "emergency-list-it", authorities = ["CUSTOMER", "CUSTOMER_EMERGENCY_LIST"])
    fun `both permissions get the pdf and record the read`() {
        val response = householdController.generateEmergencyListPdf()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        Loader.loadPDF(response.body!!.inputStream.readAllBytes()).use { document ->
            assertThat(PDFTextStripper().getText(document)).contains("Notfallliste")
        }
        assertThat(auditLogRepository.findAll())
            .anyMatch { it.entityType == AuditScope.HOUSEHOLD_EMERGENCY_LIST_ENTITY_TYPE && it.actorUsername == "emergency-list-it" }
    }
}
