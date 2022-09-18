package at.wrk.tafel.admin.backend.modules.customer.masterdata

import at.wrk.tafel.admin.backend.database.entities.CustomerEntity

interface CustomerPdfService {
    fun generateMasterdataPdf(customer: CustomerEntity): ByteArray

    fun generateIdCardPdf(customer: CustomerEntity): ByteArray
}
