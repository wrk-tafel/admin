package at.wrk.tafel.admin.backend.modules.customer

import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.io.ByteArrayInputStream

@RestController
@RequestMapping("/api/customers")
@PreAuthorize("hasAuthority('CUSTOMER')")
class CustomerController(
    private val service: CustomerService
) {
    @PostMapping("/validate")
    fun validate(@RequestBody customer: Customer): ValidateCustomerResponse {
        val result = service.validate(customer)
        return ValidateCustomerResponse(
            valid = result.valid,
            totalSum = result.totalSum,
            limit = result.limit,
            toleranceValue = result.toleranceValue,
            amountExceededLimit = result.amountExceededLimit
        )
    }

    @PostMapping
    fun createCustomer(@RequestBody customer: Customer): Customer {
        customer.id?.let {
            if (service.existsByCustomerId(it)) {
                throw ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Kunde Nr. $it bereits vorhanden!")
            }
        }

        return service.createCustomer(customer)
    }

    @PostMapping("/{id}")
    fun updateCustomer(
        @PathVariable("id") customerId: Long,
        @RequestBody customer: Customer
    ): Customer {
        if (!service.existsByCustomerId(customerId)) {
            throw ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Kunde Nr. $customerId nicht vorhanden!")
        }

        return service.updateCustomer(customerId, customer)
    }

    @GetMapping("/{customerId}")
    fun getCustomer(@PathVariable("customerId") customerId: Long): Customer {
        return service.findByCustomerId(customerId) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND)
    }

    @GetMapping
    fun getCustomers(
        @RequestParam firstname: String? = null,
        @RequestParam lastname: String? = null
    ): CustomerListResponse {
        val customerItems = service.searchForCustomers(firstname, lastname)
        return CustomerListResponse(items = customerItems)
    }

    @GetMapping("/{customerId}/generate-pdf", produces = [MediaType.APPLICATION_PDF_VALUE])
    fun generatePdf(
        @PathVariable("customerId") customerId: Long,
        @RequestParam("type") type: CustomerPdfType
    ): ResponseEntity<InputStreamResource> {
        val pdfResult = service.generatePdf(customerId, type)
        if (pdfResult != null) {
            val headers = HttpHeaders()
            headers.add(
                HttpHeaders.CONTENT_DISPOSITION,
                "inline; filename=${pdfResult.filename}"
            )

            return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(InputStreamResource(ByteArrayInputStream(pdfResult.bytes)))
        }
        return ResponseEntity.notFound().build()
    }

}
