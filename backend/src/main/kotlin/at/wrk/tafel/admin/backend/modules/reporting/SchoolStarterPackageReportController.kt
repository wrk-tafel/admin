package at.wrk.tafel.admin.backend.modules.reporting

import at.wrk.tafel.admin.backend.modules.reporting.internal.SchoolStarterPackageReportService
import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.io.ByteArrayInputStream

@RestController
@RequestMapping("/api/reporting/school-starter-package")
@PreAuthorize("hasAuthority('STATISTICS')")
class SchoolStarterPackageReportController(
    private val schoolStarterPackageReportService: SchoolStarterPackageReportService,
) {

    @GetMapping("/generate-csv", produces = [MediaType.TEXT_PLAIN_VALUE])
    fun generateCsv(): ResponseEntity<InputStreamResource> {
        val csvResult = schoolStarterPackageReportService.generateCsv()
        val headers = HttpHeaders()
        headers.add(
            HttpHeaders.CONTENT_DISPOSITION,
            "inline; filename=${csvResult.filename}",
        )

        return ResponseEntity
            .ok()
            .headers(headers)
            .contentType(MediaType.TEXT_PLAIN)
            .body(InputStreamResource(ByteArrayInputStream(csvResult.bytes)))
    }
}
