package at.wrk.tafel.admin.backend.database.model.logistics

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface CarRepository : JpaRepository<CarEntity, Long> {

    fun findByEnabledIsTrue(): List<CarEntity>

    /** What the dashboard's "Fahrzeuge" tile shows while no distribution is active. */
    fun countByEnabledIsTrue(): Int

    /**
     * Whether another car - enabled or not - already carries [licensePlate], compared the way the
     * unique index `cars_license_plate_unique_idx` compares (`upper(trim(...))`). [excludeCarId] is the
     * car being updated, whose own plate is no conflict; `null` on create.
     */
    @Query(
        """
        select count(c) > 0 from Car c
        where upper(trim(c.licensePlate)) = upper(trim(:licensePlate))
          and (:excludeCarId is null or c.id <> :excludeCarId)
        """,
    )
    fun existsOtherWithLicensePlate(licensePlate: String, excludeCarId: Long?): Boolean
}
