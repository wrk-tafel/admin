package at.wrk.tafel.admin.backend.database.common.search

import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.Expression
import jakarta.persistence.criteria.Predicate

/**
 * The matching and ranking rules behind the single search box, shared by every entity that carries a
 * trigger-maintained, lower-cased `search_text` column (see `R__00088_fulltext_search.sql`).
 *
 * A row matches when the term appears in its search text verbatim, or - so a typo still finds the
 * customer standing at the desk - when the term is trigram-similar enough to some run of words
 * inside it. `strict_word_similarity` compares the term against the best-matching extent of the text
 * rather than against the whole thing, which is what makes a threshold meaningful at all here: the
 * search text also holds address, phone number and e-mail, so plain `similarity` would drown a
 * perfect name match in trigrams the term was never going to match. The *strict* variant is what
 * keeps that from swinging too far the other way - it only considers extents that start and end on a
 * word boundary, so "Mustermann" no longer scores a hit against every "Musterhuber" in the database
 * purely on the shared stem, the way the non-strict variant's mid-word extents do.
 *
 * Verbatim hits score [EXACT_MATCH_SCORE] so they always outrank fuzzy ones.
 */
object SearchTextSpecs {

    const val SEARCH_TEXT_ATTRIBUTE = "searchText"

    private const val EXACT_MATCH_SCORE = 1.0f
    private const val LIKE_ESCAPE_CHARACTER = '\\'

    fun matches(
        cb: CriteriaBuilder,
        searchText: Expression<String>,
        searchTerm: String,
        similarityThreshold: Float,
    ): Predicate = cb.or(
        containsPredicate(cb, searchText, searchTerm),
        cb.greaterThanOrEqualTo(wordSimilarity(cb, searchText, searchTerm), similarityThreshold),
    )

    fun score(
        cb: CriteriaBuilder,
        searchText: Expression<String>,
        searchTerm: String,
    ): Expression<Float> = cb.selectCase<Float>()
        .`when`(containsPredicate(cb, searchText, searchTerm), cb.literal(EXACT_MATCH_SCORE))
        .otherwise(wordSimilarity(cb, searchText, searchTerm))

    /**
     * The term is matched against a stored value that is already lower-cased, so it only has to be
     * lower-cased itself - no `lower()` on the column, which would make the trigram index unusable.
     */
    fun normalize(searchInput: String?): String? = searchInput?.trim()?.lowercase()?.ifEmpty { null }

    private fun containsPredicate(
        cb: CriteriaBuilder,
        searchText: Expression<String>,
        searchTerm: String,
    ): Predicate = cb.like(searchText, "%${escapeLikeWildcards(searchTerm)}%", LIKE_ESCAPE_CHARACTER)

    private fun wordSimilarity(
        cb: CriteriaBuilder,
        searchText: Expression<String>,
        searchTerm: String,
    ): Expression<Float> = cb.function("strict_word_similarity", Float::class.java, cb.literal(searchTerm), searchText)

    /**
     * `%` and `_` are ordinary characters in a name or an e-mail address - without escaping them a
     * search for `_` would return every row.
     */
    private fun escapeLikeWildcards(searchTerm: String): String = searchTerm
        .replace("\\", "\\\\")
        .replace("%", "\\%")
        .replace("_", "\\_")
}
