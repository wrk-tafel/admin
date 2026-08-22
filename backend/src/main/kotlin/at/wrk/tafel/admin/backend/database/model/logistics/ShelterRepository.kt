package at.wrk.tafel.admin.backend.database.model.logistics

import org.springframework.data.jpa.repository.JpaRepository

interface ShelterRepository : JpaRepository<ShelterEntity, Long> {

    fun findByEnabledIsTrue(): List<ShelterEntity>

    /** What the dashboard's "Notschlafstellen" tile shows while no distribution is active. */
    fun countByEnabledIsTrue(): Int
}
