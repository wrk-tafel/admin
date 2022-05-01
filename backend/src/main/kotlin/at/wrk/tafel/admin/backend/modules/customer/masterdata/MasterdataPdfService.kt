package at.wrk.tafel.admin.backend.modules.customer.masterdata

import at.wrk.tafel.admin.backend.database.entities.CustomerEntity

interface MasterdataPdfService {
    fun generatePdf(customer: CustomerEntity): ByteArray
}
