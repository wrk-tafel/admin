package at.wrk.tafel.admin.backend.modules.support.model

import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class SupportRequest(
    @field:NotBlank
    @field:Size(max = 80)
    val title: String,
    @field:NotBlank
    val text: String,
    @field:Valid
    val clientContext: SupportClientContext? = null,
)

/**
 * What the browser knows about the situation the request was written in, collected by the frontend
 * and mailed along with it - the questions a report otherwise has to be answered with a round of
 * "which screen were you on, and what does it say in the browser?" before anyone can start looking.
 *
 * Every field is optional: a request must still go out when the browser can't tell us something,
 * and an older frontend against a newer backend sends none of it at all. The sizes are caps against
 * an oversized payload, not business rules - the values are free-form browser strings.
 */
data class SupportClientContext(
    /**
     * The page as a JPEG data URL (`data:image/jpeg;base64,...`), attached to the mail as an image.
     * Null when the browser could not take one or the reporter chose not to send it. The cap is
     * roughly 2 MB of image data - anything larger is dropped by the browser before it is sent.
     */
    @field:Size(max = 3_000_000)
    val screenshot: String? = null,
    @field:Size(max = 500)
    val page: String? = null,
    @field:Size(max = 500)
    val userAgent: String? = null,
    @field:Size(max = 50)
    val viewport: String? = null,
    @field:Size(max = 50)
    val screen: String? = null,
    @field:Size(max = 50)
    val language: String? = null,
    @field:Size(max = 100)
    val timeZone: String? = null,
    @field:Valid
    @field:Size(max = 20)
    val recentErrors: List<SupportClientLogItem> = emptyList(),
)

data class SupportClientLogItem(
    @field:Size(max = 50)
    val timestamp: String? = null,
    @field:Size(max = 1000)
    val message: String? = null,
)
