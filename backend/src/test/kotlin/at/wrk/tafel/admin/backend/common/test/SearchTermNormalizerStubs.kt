package at.wrk.tafel.admin.backend.common.test

import at.wrk.tafel.admin.backend.database.common.search.SearchTermNormalizer
import io.mockk.every

/**
 * Lets a mocked [SearchTermNormalizer] fold a term roughly like the database does (trim and
 * lower-case), for unit tests that only care that a term arrives. The diacritics part is the
 * database's - `SearchTermNormalizerIT` covers that against the real function.
 */
fun stubFolding(searchTermNormalizer: SearchTermNormalizer) {
    every { searchTermNormalizer.normalize(any()) } answers {
        firstArg<String?>()?.trim()?.lowercase()?.ifEmpty { null }
    }
}
