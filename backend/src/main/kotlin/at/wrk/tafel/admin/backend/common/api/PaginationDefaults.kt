package at.wrk.tafel.admin.backend.common.api

object PaginationDefaults {
    const val DEFAULT_PAGE_SIZE = 10
    private val ALLOWED_PAGE_SIZES = setOf(5, 10, 25, 50, 100)

    fun resolvePageSize(pageSize: Int?): Int = pageSize?.takeIf { it in ALLOWED_PAGE_SIZES } ?: DEFAULT_PAGE_SIZE

    /**
     * The 1-based `page` query parameter, translated to the 0-based index [PageRequest.of] expects.
     * `page` is clamped to at least 1 first - passing it straight through as `page - 1` turns a caller
     * sending `page=0` (or a negative value) into a negative page index, which [PageRequest.of] rejects
     * with an [IllegalArgumentException] that surfaces as a 500 instead of just showing the first page.
     */
    fun resolvePageIndex(page: Int?): Int = (page ?: 1).coerceAtLeast(1) - 1
}
