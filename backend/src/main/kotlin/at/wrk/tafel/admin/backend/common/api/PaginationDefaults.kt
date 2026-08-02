package at.wrk.tafel.admin.backend.common.api

object PaginationDefaults {
    const val DEFAULT_PAGE_SIZE = 10
    private val ALLOWED_PAGE_SIZES = setOf(5, 10, 25, 50, 100)

    fun resolvePageSize(pageSize: Int?): Int = pageSize?.takeIf { it in ALLOWED_PAGE_SIZES } ?: DEFAULT_PAGE_SIZE
}
