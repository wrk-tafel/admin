package at.wrk.tafel.admin.backend.modules.customer.internal

import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
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
                throw TafelValidationException("Kunde Nr. $it bereits vorhanden!")
            }
        }

        return service.createCustomer(customer)
    }

    @PostMapping("/{customerId}")
    fun updateCustomer(
        @PathVariable("customerId") customerId: Long,
        @RequestBody customer: Customer
    ): Customer {
        if (!service.existsByCustomerId(customerId)) {
            throw TafelValidationException(
                message = "Kunde Nr. $customerId nicht vorhanden!",
                status = HttpStatus.NOT_FOUND
            )
        }

        return service.updateCustomer(customerId, customer)
    }

    @GetMapping("/{customerId}")
    fun getCustomer(@PathVariable("customerId") customerId: Long): Customer {
        return service.findByCustomerId(customerId)
            ?: throw TafelValidationException(
                message = "Kunde Nr. $customerId nicht gefunden!",
                status = HttpStatus.NOT_FOUND
            )
    }

    @GetMapping
    fun getCustomers(
        @RequestParam firstname: String? = null,
        @RequestParam lastname: String? = null
    ): CustomerListResponse {
        val customerItems = service.getCustomers(firstname?.trim(), lastname?.trim())
        return CustomerListResponse(items = customerItems)
    }

    @DeleteMapping("/{customerId}")
    fun deleteCustomer(@PathVariable("customerId") customerId: Long) {
        if (!service.existsByCustomerId(customerId)) {
            throw TafelValidationException(
                message = "Kunde Nr. $customerId nicht vorhanden!",
                status = HttpStatus.NOT_FOUND
            )
        }

        service.deleteCustomerByCustomerId(customerId)
    }

    @GetMapping("/{customerId}/generate-pdf", produces = [MediaType.APPLICATION_PDF_VALUE])
    fun generatePdf(
        @PathVariable("customerId") customerId: Long,
        @RequestParam("type") type: CustomerPdfType
    ): ResponseEntity<InputStreamResource> {
        val pdfResult = service.generatePdf(customerId, type)
        pdfResult?.let {
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
        } ?: throw TafelValidationException(
            message = "Kunde Nr. $customerId nicht vorhanden!",
            status = HttpStatus.NOT_FOUND
        )
    }

}
