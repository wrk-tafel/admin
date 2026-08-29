package at.wrk.tafel.admin.backend.common.api

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class PaginationDefaultsTest {

    @Test
    fun `resolvePageSize falls back to the default for null`() {
        assertThat(PaginationDefaults.resolvePageSize(null)).isEqualTo(PaginationDefaults.DEFAULT_PAGE_SIZE)
    }

    @Test
    fun `resolvePageSize falls back to the default for a size outside the allow-list`() {
        assertThat(PaginationDefaults.resolvePageSize(7)).isEqualTo(PaginationDefaults.DEFAULT_PAGE_SIZE)
    }

    @Test
    fun `resolvePageSize keeps an allowed size`() {
        assertThat(PaginationDefaults.resolvePageSize(25)).isEqualTo(25)
    }

    @Test
    fun `resolvePageIndex translates the 1-based page into a 0-based index`() {
        assertThat(PaginationDefaults.resolvePageIndex(1)).isEqualTo(0)
        assertThat(PaginationDefaults.resolvePageIndex(2)).isEqualTo(1)
    }

    @Test
    fun `resolvePageIndex falls back to the first page for null`() {
        assertThat(PaginationDefaults.resolvePageIndex(null)).isEqualTo(0)
    }

    /**
     * `page=0` (or a negative value) used to be passed straight through as `page - 1`, producing a
     * negative page index that `PageRequest.of` rejects with an `IllegalArgumentException` - a 500
     * for what should just show the first page. See issue #3531.
     */
    @Test
    fun `resolvePageIndex clamps zero and negative values to the first page rather than going negative`() {
        assertThat(PaginationDefaults.resolvePageIndex(0)).isEqualTo(0)
        assertThat(PaginationDefaults.resolvePageIndex(-1)).isEqualTo(0)
        assertThat(PaginationDefaults.resolvePageIndex(-100)).isEqualTo(0)
    }
}
