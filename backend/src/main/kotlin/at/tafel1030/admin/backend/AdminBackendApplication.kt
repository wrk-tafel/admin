package at.tafel1030.admin.backend

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class AdminBackendApplication {

    companion object {
        @JvmStatic
        fun main(args: Array<String>) {
            runApplication<AdminBackendApplication>(*args)
        }
    }

}
