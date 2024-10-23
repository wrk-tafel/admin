package at.wrk.tafel.admin.backend.modules.customer.api

import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.customer.api.model.Customer
import at.wrk.tafel.admin.backend.modules.customer.api.model.CustomerDuplicatesResponse
import at.wrk.tafel.admin.backend.modules.customer.api.model.CustomerDuplicationItem
import at.wrk.tafel.admin.backend.modules.customer.service.internal.CustomerDuplicationService
import at.wrk.tafel.admin.backend.modules.customer.api.model.CustomerListResponse
import at.wrk.tafel.admin.backend.modules.customer.api.model.CustomerMergeRequest
import at.wrk.tafel.admin.backend.modules.customer.api.model.CustomerPdfType
import at.wrk.tafel.admin.backend.modules.customer.service.internal.CustomerService
import at.wrk.tafel.admin.backend.modules.customer.api.model.ValidateCustomerResponse
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
class CustomerController(
    private val customerService: CustomerService,
    private val customerDuplicationService: CustomerDuplicationService
) {
    @PostMapping("/validate")
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun validate(@RequestBody customer: Customer): ValidateCustomerResponse {
        val result = customerService.validate(customer)
        return ValidateCustomerResponse(
            valid = result.valid,
            totalSum = result.totalSum,
            limit = result.limit,
            toleranceValue = result.toleranceValue,
            amountExceededLimit = result.amountExceededLimit
        )
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun createCustomer(@RequestBody customer: Customer): Customer {
        customer.id?.let {
            if (customerService.existsByCustomerId(it)) {
                throw TafelValidationException("Kunde Nr. $it bereits vorhanden!")
            }
        }

        return customerService.createCustomer(customer)
    }

    @PostMapping("/{customerId}")
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun updateCustomer(
        @PathVariable("customerId") customerId: Long,
        @RequestBody customer: Customer
    ): Customer {
        if (!customerService.existsByCustomerId(customerId)) {
            throw TafelValidationException(
                message = "Kunde Nr. $customerId nicht vorhanden!",
                status = HttpStatus.NOT_FOUND
            )
        }

        return customerService.updateCustomer(customerId, customer)
    }

    @GetMapping("/{customerId}")
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun getCustomer(@PathVariable("customerId") customerId: Long): Customer {
        return customerService.findByCustomerId(customerId)
            ?: throw TafelValidationException(
                message = "Kunde Nr. $customerId nicht gefunden!",
                status = HttpStatus.NOT_FOUND
            )
    }

    @GetMapping
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun getCustomers(
        @RequestParam firstname: String? = null,
        @RequestParam lastname: String? = null,
        @RequestParam page: Int? = null,
        @RequestParam postProcessing: Boolean? = null
    ): CustomerListResponse {
        val customerSearchResult = customerService.getCustomers(
            firstname = firstname?.trim(),
            lastname = lastname?.trim(),
            page = page,
            postProcessing = postProcessing
        )
        return CustomerListResponse(
            items = customerSearchResult.items,
            totalCount = customerSearchResult.totalCount,
            currentPage = customerSearchResult.currentPage,
            totalPages = customerSearchResult.totalPages,
            pageSize = customerSearchResult.pageSize
        )
    }

    @DeleteMapping("/{customerId}")
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun deleteCustomer(@PathVariable("customerId") customerId: Long) {
        if (!customerService.existsByCustomerId(customerId)) {
            throw TafelValidationException(
                message = "Kunde Nr. $customerId nicht vorhanden!",
                status = HttpStatus.NOT_FOUND
            )
        }

        customerService.deleteCustomerByCustomerId(customerId)
    }

    @GetMapping("/{customerId}/generate-pdf", produces = [MediaType.APPLICATION_PDF_VALUE])
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun generatePdf(
        @PathVariable("customerId") customerId: Long,
        @RequestParam("type") type: CustomerPdfType
    ): ResponseEntity<InputStreamResource> {
        val pdfResult = customerService.generatePdf(customerId, type)
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

    @GetMapping("/duplicates")
    @PreAuthorize("hasAuthority('CUSTOMER_DUPLICATES')")
    fun getDuplicates(
        @RequestParam page: Int? = null,
    ): CustomerDuplicatesResponse {
        val duplicateSearchResult = customerDuplicationService.findDuplicates(page)
        return CustomerDuplicatesResponse(
            items = duplicateSearchResult.items.map {
                CustomerDuplicationItem(
                    customer = it.customer,
                    similarCustomers = it.similarCustomers
                )
            },
            totalCount = duplicateSearchResult.totalCount,
            currentPage = duplicateSearchResult.currentPage,
            totalPages = duplicateSearchResult.totalPages,
            pageSize = duplicateSearchResult.pageSize
        )
    }

    @PostMapping("/{customerId}/merge")
    @PreAuthorize("hasAuthority('CUSTOMER_DUPLICATES')")
    fun mergeIntoCustomer(
        @PathVariable("customerId") customerId: Long,
        @RequestBody request: CustomerMergeRequest
    ): ResponseEntity<Any> {
        customerService.mergeCustomers(customerId, request.sourceCustomerIds)
        return ResponseEntity.ok().build()
    }

}
