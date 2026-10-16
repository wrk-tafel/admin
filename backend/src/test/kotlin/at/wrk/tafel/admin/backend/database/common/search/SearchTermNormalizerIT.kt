package at.wrk.tafel.admin.backend.database.common.search

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired

/**
 * The term has to be folded exactly like the stored `search_text` - against the real
 * `fold_search_text` function, since a mocked database could only ever agree with itself.
 */
class SearchTermNormalizerIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var searchTermNormalizer: SearchTermNormalizer

    @Test
    fun `folds case and diacritics`() {
        assertThat(searchTermNormalizer.normalize("Öztürk Ayşe")).isEqualTo("ozturk ayse")
        assertThat(searchTermNormalizer.normalize("Yılmaz")).isEqualTo("yilmaz")
        assertThat(searchTermNormalizer.normalize("Łódź Đorđe")).isEqualTo("lodz dorde")
    }

    @Test
    fun `folds the sharp s into ss`() {
        assertThat(searchTermNormalizer.normalize("Weiß")).isEqualTo("weiss")
        assertThat(searchTermNormalizer.normalize("WEISS")).isEqualTo("weiss")
    }

    @Test
    fun `trims and keeps characters that need no folding`() {
        assertThat(searchTermNormalizer.normalize("  17.02.1903 ")).isEqualTo("17.02.1903")
        assertThat(searchTermNormalizer.normalize("max_m%@example.org")).isEqualTo("max_m%@example.org")
    }

    @Test
    fun `blank input is no term at all`() {
        assertThat(searchTermNormalizer.normalize(null)).isNull()
        assertThat(searchTermNormalizer.normalize("   ")).isNull()
    }
}
