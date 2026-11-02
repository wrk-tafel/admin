package at.wrk.tafel.admin.backend.database.common.search

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional

/**
 * Turns what was typed into the search box into the term [SearchTextSpecs] matches against
 * `search_text`: trimmed, then *folded* - lower-cased and stripped of diacritics - by the same
 * `fold_search_text` database function the triggers store `search_text` with
 * (`R__00134_fold_search_text_and_employee_search_text.sql`, ADR-0071).
 *
 * Asking the database rather than folding in Kotlin is the point: two implementations of "strip the
 * accents" would sooner or later disagree on some character, and every such character would make a
 * stored name unfindable. The cost is one trivial round trip per search.
 *
 * The same statement sets `tafeladmin.search.similarityThreshold` as the transaction's cutoff for the
 * `<<%` operator [SearchTextSpecs] filters with, which is why a transaction is mandatory: outside of
 * one the setting would last for that statement alone, and the search would silently run with the
 * database's default cutoff (ADR-0078).
 */
@Component
class SearchTermNormalizer(
    private val jdbcTemplate: JdbcTemplate,
    private val tafelAdminProperties: TafelAdminProperties,
) {
    @Transactional(propagation = Propagation.MANDATORY)
    fun normalize(searchInput: String?): String? {
        val trimmed = searchInput?.trim()?.ifEmpty { null } ?: return null
        return jdbcTemplate.queryForObject(
            "select fold_search_text(?), set_config('pg_trgm.strict_word_similarity_threshold', ?, true)",
            { resultSet, _ -> resultSet.getString(1) },
            trimmed,
            tafelAdminProperties.search.similarityThreshold.toString(),
        )
            ?.trim()
            ?.ifEmpty { null }
    }
}
