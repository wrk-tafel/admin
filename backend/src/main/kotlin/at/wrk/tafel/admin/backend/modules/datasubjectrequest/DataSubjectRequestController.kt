package at.wrk.tafel.admin.backend.modules.datasubjectrequest

import at.wrk.tafel.admin.backend.modules.datasubjectrequest.internal.DataSubjectRequestService
import jakarta.validation.Valid
import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.io.ByteArrayInputStream

/**
 * The central "Datenauskunft" screen (issue #3396). Behind `DATA_SUBJECT_REQUESTS`, which only
 * gates reaching this controller - [DataSubjectRequestService] separately re-checks each matched
 * record's own area permission (`CUSTOMER`/`USER_MANAGEMENT`/`SETTINGS`) before exporting or
 * deleting it, since holding `DATA_SUBJECT_REQUESTS` alone was deliberately made additive rather
 * than a replacement for those.
 */
@RestController
@RequestMapping("/api/data-subject-requests")
@PreAuthorize("hasAuthority('DATA_SUBJECT_REQUESTS')")
class DataSubjectRequestController(
    private val dataSubjectRequestService: DataSubjectRequestService,
) {

    @GetMapping("/search")
    fun search(@RequestParam searchInput: String): DataSubjectMatchListResponse = dataSubjectRequestService.search(searchInput)

    /**
     * The GDPR Art. 15/20 combined data takeout for one or more selected matches - one ZIP even for
     * a single match, see [DataSubjectRequestService.export]'s KDoc for why.
     */
    @PostMapping("/export", produces = ["application/zip"])
    fun export(@Valid @RequestBody request: DataSubjectExportRequest): ResponseEntity<InputStreamResource> {
        val result = dataSubjectRequestService.export(request.matches)

        val headers = HttpHeaders()
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=${result.filename}")

        return ResponseEntity
            .ok()
            .headers(headers)
            .contentType(MediaType.valueOf("application/zip"))
            .body(InputStreamResource(ByteArrayInputStream(result.bytes)))
    }

    /** The GDPR Art. 17 erasure for one or more selected matches, one outcome per match. */
    @PostMapping("/delete")
    fun delete(@Valid @RequestBody request: DataSubjectDeleteRequest): DataSubjectDeleteResponse = dataSubjectRequestService.delete(request.matches)
}
