package at.wrk.tafel.admin.backend.database.model.logistics

import org.springframework.data.jpa.repository.JpaRepository

interface ShopRepository : JpaRepository<ShopEntity, Long> {
    fun findByNumber(number: Int): ShopEntity?

    /** What the dashboard's "Filialen" tile shows while no distribution is active. */
    fun countByEnabledIsTrue(): Int
}
