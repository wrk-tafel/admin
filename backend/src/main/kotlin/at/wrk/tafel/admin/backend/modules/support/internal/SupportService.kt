package at.wrk.tafel.admin.backend.modules.support.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.web.client.RestClient

private const val GITHUB_API_BASE_URL = "https://api.github.com"

@Service
class SupportService(
    private val tafelAdminProperties: TafelAdminProperties,
    private val restClient: RestClient = RestClient.builder().baseUrl(GITHUB_API_BASE_URL).build(),
) {

    fun createSupportIssue(title: String, text: String) {
        val supportProperties = tafelAdminProperties.support
            ?: throw TafelApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Support-Kontakt ist nicht konfiguriert")
        val githubToken = supportProperties.githubToken
            ?: throw TafelApiException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Support-Kontakt ist nicht konfiguriert (GitHub-Token fehlt)",
            )

        val issueTitle = "${supportProperties.titlePrefix} $title"

        // githubRepository is an "owner/repo" string from trusted app config (not user input), so it's
        // interpolated directly - a {repository} URI template variable would percent-encode the "/".
        restClient.post()
            .uri("/repos/${supportProperties.githubRepository}/issues")
            .header(HttpHeaders.AUTHORIZATION, "Bearer $githubToken")
            .header(HttpHeaders.ACCEPT, "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .contentType(MediaType.APPLICATION_JSON)
            .body(GithubCreateIssueRequest(title = issueTitle, body = text))
            .retrieve()
            .toBodilessEntity()
    }
}

data class GithubCreateIssueRequest(
    val title: String,
    val body: String,
)
