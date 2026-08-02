package at.wrk.tafel.admin.backend.database.model.household

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createCountry
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createHousehold
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.boot.jpa.test.autoconfigure.find
import org.springframework.transaction.annotation.Transactional

/**
 * Guards against the id generation regression that shipped with the household_documents table:
 * Hibernate's `id.db_structure_naming_strategy` is "standard" in this app (see
 * R__00070_migrate_id_sequences.sql), so every entity table needs its own `<table>_seq` sequence.
 * Without `household_documents_seq` (created in R__00080), saving a DocumentEntity fails at
 * runtime with "relation household_documents_seq does not exist" - a mocked-repository unit test
 * can't catch that, only a real database can.
 */
class DocumentEntityIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    private lateinit var testUser: UserEntity
    private lateinit var testCountry: CountryEntity

    @BeforeEach
    fun beforeEach() {
        testUser = createUser()
        testEntityManager.persist(testUser)

        testCountry = createCountry()
        testEntityManager.persist(testCountry)
    }

    @Test
    @Transactional
    fun `document entity is persisted with a generated id`() {
        val household = createHousehold(testUser.employee!!, testCountry)
        testEntityManager.persist(household)
        testEntityManager.flush()

        val document = DocumentEntity().apply {
            this.household = household
            this.documentType = DocumentType.OTHER
            this.fileName = "test.pdf"
            this.contentType = "application/pdf"
            this.storagePath = "/tmp/test.pdf"
            this.uploadedByUser = testUser
        }
        testEntityManager.persist(document)
        testEntityManager.flush()
        testEntityManager.clear()

        assertThat(document.id).isNotNull

        val persisted = testEntityManager.find<DocumentEntity>(document.id!!)
        assertThat(persisted).isNotNull
        assertThat(persisted!!.fileName).isEqualTo("test.pdf")
    }
}
