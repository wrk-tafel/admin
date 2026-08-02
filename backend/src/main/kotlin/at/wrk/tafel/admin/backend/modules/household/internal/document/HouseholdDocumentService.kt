package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.household.DocumentEntity
import at.wrk.tafel.admin.backend.database.model.household.DocumentRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import org.springframework.http.MediaType
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import at.wrk.tafel.admin.backend.database.model.household.DocumentType as DocumentTypeEntity

@Service
class HouseholdDocumentService(
    private val documentRepository: DocumentRepository,
    private val householdRepository: HouseholdRepository,
    private val userRepository: UserRepository,
    private val documentStorageService: DocumentStorageService,
    private val scannerFileService: ScannerFileService,
    private val documentScannerWatcherService: DocumentScannerWatcherService,
) {

    companion object {
        private val ALLOWED_CONTENT_TYPES = setOf(MediaType.APPLICATION_PDF_VALUE, MediaType.IMAGE_JPEG_VALUE, MediaType.IMAGE_PNG_VALUE)
        private const val MAX_FILE_SIZE_MB = 25
        private const val MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024L
    }

    @Transactional
    fun uploadDocument(
        householdId: Long,
        personId: Long?,
        documentType: DocumentType,
        file: MultipartFile,
    ): DocumentItem {
        val household = findHousehold(householdId)
        val person = resolvePerson(household, personId)

        if (file.isEmpty) {
            throw BusinessRuleException("Datei ist leer!")
        }
        validateSize(file.size)
        validateContentType(file.contentType)

        val storagePath = documentStorageService.store(
            householdId = householdId,
            originalFileName = file.originalFilename ?: "dokument",
            bytes = file.bytes,
        )

        val entity = DocumentEntity().apply {
            this.household = household
            this.person = person
            this.documentType = DocumentTypeEntity.valueOf(documentType.name)
            this.fileName = file.originalFilename ?: "dokument"
            this.contentType = file.contentType!!
            this.storagePath = storagePath
            this.uploadedByUser = currentUser()
        }

        return mapToItem(documentRepository.saveAndFlush(entity))
    }

    @Transactional
    fun importFromScannerFile(
        householdId: Long,
        fileName: String,
        personId: Long?,
        documentType: DocumentType,
    ): DocumentItem {
        val household = findHousehold(householdId)
        val person = resolvePerson(household, personId)

        val bytes = scannerFileService.read(fileName)
        val contentType = scannerFileService.resolveContentType(fileName)
        validateSize(bytes.size.toLong())
        validateContentType(contentType)

        val storagePath = documentStorageService.store(
            householdId = householdId,
            originalFileName = fileName,
            bytes = bytes,
        )

        val entity = DocumentEntity().apply {
            this.household = household
            this.person = person
            this.documentType = DocumentTypeEntity.valueOf(documentType.name)
            this.fileName = fileName
            this.contentType = contentType
            this.storagePath = storagePath
            this.uploadedByUser = currentUser()
        }

        val savedEntity = documentRepository.saveAndFlush(entity)

        scannerFileService.delete(fileName)
        documentScannerWatcherService.publishIfChanged()

        return mapToItem(savedEntity)
    }

    @Transactional(readOnly = true)
    fun getDocuments(householdId: Long): List<DocumentItem> = documentRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(householdId).map { mapToItem(it) }

    @Transactional(readOnly = true)
    fun getDocumentFile(householdId: Long, documentId: Long): DocumentFileResult {
        val document = findDocument(householdId, documentId)
        val bytes = documentStorageService.read(document.storagePath!!)
        return DocumentFileResult(
            fileName = document.fileName!!,
            contentType = document.contentType!!,
            bytes = bytes,
        )
    }

    @Transactional
    fun deleteDocument(householdId: Long, documentId: Long) {
        val document = findDocument(householdId, documentId)
        documentStorageService.delete(document.storagePath!!)
        documentRepository.delete(document)
    }

    private fun findHousehold(householdId: Long): HouseholdEntity = householdRepository.findByHouseholdId(householdId)
        ?: throw NotFoundException("Kunde Nr. $householdId nicht vorhanden!")

    private fun findDocument(householdId: Long, documentId: Long) = documentRepository.findByIdAndHouseholdHouseholdId(documentId, householdId)
        ?: throw NotFoundException("Dokument Nr. $documentId nicht vorhanden!")

    private fun resolvePerson(household: HouseholdEntity, personId: Long?) = personId?.let { id ->
        household.persons.firstOrNull { it.id == id }
            ?: throw NotFoundException("Person Nr. $id nicht bei Kunde Nr. ${household.householdId} vorhanden!")
    }

    private fun validateSize(sizeBytes: Long) {
        if (sizeBytes > MAX_FILE_SIZE_BYTES) {
            throw BusinessRuleException("Datei ist zu groß (max. $MAX_FILE_SIZE_MB MB)!")
        }
    }

    private fun validateContentType(contentType: String?) {
        if (contentType !in ALLOWED_CONTENT_TYPES) {
            throw BusinessRuleException("Dateityp wird nicht unterstützt!")
        }
    }

    private fun currentUser() = (SecurityContextHolder.getContext().authentication as TafelJwtAuthentication).username
        ?.let { userRepository.findByUsername(it) }

    private fun mapToItem(entity: DocumentEntity): DocumentItem {
        val employee = entity.uploadedByUser?.employee
        val uploadedBy = listOfNotNull(employee?.personnelNumber, employee?.firstname, employee?.lastname)
            .joinToString(" ")
            .ifBlank { null }

        return DocumentItem(
            id = entity.id!!,
            documentType = DocumentType.valueOf(entity.documentType!!.name),
            fileName = entity.fileName!!,
            uploadedAt = entity.createdAt!!,
            uploadedBy = uploadedBy,
            personId = entity.person?.id,
        )
    }
}
