package at.wrk.tafel.admin.backend.database.model.logistics

import org.springframework.data.jpa.repository.JpaRepository

interface CarRepository : JpaRepository<CarEntity, Long> {

    fun findByEnabledIsTrue(): List<CarEntity>

    /** What the dashboard's "Fahrzeuge" tile shows while no distribution is active. */
    fun countByEnabledIsTrue(): Int
}
