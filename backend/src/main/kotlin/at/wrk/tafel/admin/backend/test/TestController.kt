package at.wrk.tafel.admin.backend.test

import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/test")
class TestController {

    @GetMapping("/authenticated")
    @PreAuthorize("isAuthenticated()")
    fun authenticated(): String {
        return "authenticated response"
    }

    @GetMapping("/checkin")
    @PreAuthorize("hasAuthority('CHECKIN')")
    fun checkin(): String {
        return "checkin response"
    }

}
