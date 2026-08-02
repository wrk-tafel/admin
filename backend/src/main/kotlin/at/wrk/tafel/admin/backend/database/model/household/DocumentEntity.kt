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
class DocumentEntity : BaseChangeTrackingEntity() {

    @ManyToOne
    @JoinColumn(name = "household_id", nullable = false)
    var household: HouseholdEntity? = null

    @ManyToOne
    @JoinColumn(name = "person_id")
    var person: PersonEntity? = null

    @Column(name = "document_type")
    @Enumerated(EnumType.STRING)
    var documentType: DocumentType? = null

    @Column(name = "file_name")
    var fileName: String? = null

    @Column(name = "content_type")
    var contentType: String? = null

    @Column(name = "storage_path")
    var storagePath: String? = null

    @ManyToOne
    @JoinColumn(name = "uploaded_by_user_id")
    var uploadedByUser: UserEntity? = null
}
