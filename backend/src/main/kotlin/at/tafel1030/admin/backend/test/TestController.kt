package at.tafel1030.admin.backend.test

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class TestController {

    @GetMapping("test")
    fun test(): String {
        return "testResponse";
    }
}