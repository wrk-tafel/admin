package at.wrk.tafel.admin.backend.database.common.search

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component

/**
 * Turns what was typed into the search box into the term [SearchTextSpecs] matches against
 * `search_text`: trimmed, then *folded* - lower-cased and stripped of diacritics - by the same
 * `fold_search_text` database function the triggers store `search_text` with
 * (`R__00134_fold_search_text_and_employee_search_text.sql`, ADR-0071).
 *
 * Asking the database rather than folding in Kotlin is the point: two implementations of "strip the
 * accents" would sooner or later disagree on some character, and every such character would make a
 * stored name unfindable. The cost is one trivial round trip per search.
 */
@Component
class SearchTermNormalizer(
    private val jdbcTemplate: JdbcTemplate,
) {
    fun normalize(searchInput: String?): String? {
        val trimmed = searchInput?.trim()?.ifEmpty { null } ?: return null
        return jdbcTemplate.queryForObject("select fold_search_text(?)", String::class.java, trimmed)
            ?.trim()
            ?.ifEmpty { null }
    }
}
