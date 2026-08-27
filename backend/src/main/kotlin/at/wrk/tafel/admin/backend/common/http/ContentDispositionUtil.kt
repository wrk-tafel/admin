package at.wrk.tafel.admin.backend.common.http

import org.springframework.http.ContentDisposition
import org.springframework.http.HttpHeaders
import java.nio.charset.StandardCharsets

/**
 * Builds the `Content-Disposition` header for a file download/export response. A raw
 * `"inline; filename=$name"`/`"attachment; filename=$name"` string is unsafe: a stored filename
 * containing `;`, `"` or non-ASCII characters produces either a malformed header or a spoofed
 * download name (see issue #3438). Spring's [ContentDisposition] quotes the filename and adds an
 * RFC 5987-encoded `filename*` parameter instead, so every character survives round-trip
 * regardless of what the stored filename contains.
 */
object ContentDispositionUtil {

    fun inline(filename: String): HttpHeaders = headers(ContentDisposition.inline(), filename)

    fun attachment(filename: String): HttpHeaders = headers(ContentDisposition.attachment(), filename)

    private fun headers(builder: ContentDisposition.Builder, filename: String): HttpHeaders {
        val headers = HttpHeaders()
        headers.contentDisposition = builder.filename(filename, StandardCharsets.UTF_8).build()
        return headers
    }
}
