package at.wrk.tafel.admin.backend.modules.customer

import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/customer")
class CustomerController {

    @GetMapping
    @PreAuthorize("hasAuthority('CUSTOMER_WRITE')")
    fun createCustomer(): String {
        return "test123"
    }
}
