package at.wrk.tafel.admin.backend.modules.household.internal.masterdata

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import com.fasterxml.jackson.annotation.JsonRootName

@JsonRootName("data")
@ExcludeFromTestCoverage
data class PdfData(
    val logoContentType: String,
    val logoBytes: ByteArray,
    val issuer: String?,
    val issuedAtDate: String,
    val customer: PdfCustomerData,
    val countPersons: Int,
    val countInfants: Int,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as PdfData

        if (logoContentType != other.logoContentType) return false
        if (!logoBytes.contentEquals(other.logoBytes)) return false
        if (issuedAtDate != other.issuedAtDate) return false
        if (customer != other.customer) return false
        if (countPersons != other.countPersons) return false
        if (countInfants != other.countInfants) return false

        return true
    }

    override fun hashCode(): Int {
        var result = logoContentType.hashCode()
        result = 31 * result + logoBytes.contentHashCode()
        result = 31 * result + issuedAtDate.hashCode()
        result = 31 * result + customer.hashCode()
        result = 31 * result + countPersons
        result = 31 * result + countInfants
        return result
    }
}

@ExcludeFromTestCoverage
data class PdfCustomerData(
    val id: Long,
    val lastname: String?,
    val firstname: String?,
    val birthDate: String,
    val gender: String?,
    val country: String,
    val telephoneNumber: String? = null,
    val email: String? = null,
    val address: PdfAddressData,
    val employer: String,
    val income: String? = null,
    val incomeDueDate: String? = null,
    val validUntilDate: String,
    val additionalPersons: List<PdfAdditionalPersonData> = emptyList(),
    val idCard: PdfIdCardData? = null,
)

@ExcludeFromTestCoverage
data class PdfAddressData(
    val street: String,
    val houseNumber: String?,
    val door: String? = null,
    val stairway: String? = null,
    val postalCode: Int?,
    val city: String,
)

@ExcludeFromTestCoverage
data class PdfAdditionalPersonData(
    val lastname: String,
    val firstname: String,
    val birthDate: String,
    val gender: String?,
    val country: String,
    val employer: String? = null,
    val income: String? = null,
    val incomeDueDate: String? = null,
    val excludeFromHousehold: Boolean = false,
)

@ExcludeFromTestCoverage
data class PdfIdCardData(
    val qrCodeContentType: String,
    val qrCodeBytes: ByteArray,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as PdfIdCardData

        if (qrCodeContentType != other.qrCodeContentType) return false
        if (!qrCodeBytes.contentEquals(other.qrCodeBytes)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = qrCodeContentType.hashCode()
        result = 31 * result + qrCodeBytes.contentHashCode()
        return result
    }
}

@JsonRootName("data")
@ExcludeFromTestCoverage
data class PrivacyNoticePdfData(
    val logoContentType: String,
    val logoBytes: ByteArray,
    /**
     * Blank for the reference-less template (see [at.wrk.tafel.admin.backend.modules.household.internal.masterdata.HouseholdPdfService.generatePrivacyNoticeTemplatePdf]) -
     * a `String`, not the household's own `Long` id, purely because this is display-only text, never
     * parsed back.
     */
    val householdId: String,
    val fullName: String,
    val issuedAtDate: String,
    /**
     * `tafeladmin.householdDeletion.retentionYears` as display text (GDPR gap G2 follow-up, issue
     * #3429) - the printed sheet used to hard-code "7 Jahre", which silently went stale the moment
     * an operator changed the property. Read per generation, same as [HouseholdRetentionService][at.wrk.tafel.admin.backend.modules.household.internal.HouseholdRetentionService]
     * reads it, rather than baked in at compile time.
     */
    val retentionYears: String,
    /**
     * Printed in the footer next to the page number (issue #3429 follow-up) - unlike [issuedAtDate],
     * which stays blank on the reference-less template for a staff member to fill in by hand, this is
     * always the actual generation date, so loose pages of a printed multi-page copy can be matched
     * back up.
     */
    val generatedAt: String,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as PrivacyNoticePdfData

        if (logoContentType != other.logoContentType) return false
        if (!logoBytes.contentEquals(other.logoBytes)) return false
        if (householdId != other.householdId) return false
        if (fullName != other.fullName) return false
        if (issuedAtDate != other.issuedAtDate) return false
        if (retentionYears != other.retentionYears) return false
        if (generatedAt != other.generatedAt) return false

        return true
    }

    override fun hashCode(): Int {
        var result = logoContentType.hashCode()
        result = 31 * result + logoBytes.contentHashCode()
        result = 31 * result + householdId.hashCode()
        result = 31 * result + fullName.hashCode()
        result = 31 * result + issuedAtDate.hashCode()
        result = 31 * result + generatedAt.hashCode()
        result = 31 * result + retentionYears.hashCode()
        return result
    }
}
