package at.wrk.tafel.admin.backend.database.model.household

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
enum class DocumentType {
    PROOF_OF_INCOME,
    ID,
    SCHOOL_ENROLLMENT,
    OTHER,
}
