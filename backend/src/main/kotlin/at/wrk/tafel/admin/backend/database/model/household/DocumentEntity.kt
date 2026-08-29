package at.wrk.tafel.admin.backend.database.model.household

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity(name = "Document")
@Table(name = "household_documents")
@ExcludeFromTestCoverage
class DocumentEntity(
    @ManyToOne
    @JoinColumn(name = "household_id", nullable = false)
    var household: HouseholdEntity,
    @Column(name = "document_type")
    @Enumerated(EnumType.STRING)
    var documentType: DocumentType,
    @Column(name = "file_name")
    var fileName: String,
    @Column(name = "content_type")
    var contentType: String,
    @Column(name = "storage_path")
    var storagePath: String,
) : BaseChangeTrackingEntity() {

    @ManyToOne
    @JoinColumn(name = "person_id")
    var person: PersonEntity? = null

    @ManyToOne
    @JoinColumn(name = "uploaded_by_user_id")
    var uploadedByUser: UserEntity? = null

    /**
     * The `tafeladmin.householdDeletion.retentionTime` [java.time.Period] live at upload time, stored
     * as its canonical ISO-8601 text ([java.time.Period.toString], e.g. `"P7Y"`) - only stamped for
     * [DocumentType.PRIVACY_NOTICE], since that's the only document type whose printed text states a
     * retention figure that can later drift from the live config (issue #3500). `null` for every
     * other document type, and for a `PRIVACY_NOTICE` uploaded before this field existed.
     */
    @Column(name = "retention_period_at_upload")
    var retentionPeriodAtUpload: String? = null
}
