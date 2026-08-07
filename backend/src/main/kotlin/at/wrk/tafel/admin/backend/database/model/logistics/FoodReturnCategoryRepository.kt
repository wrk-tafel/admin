package at.wrk.tafel.admin.backend.database.model.logistics

import org.springframework.data.jpa.repository.JpaRepository

interface FoodReturnCategoryRepository : JpaRepository<FoodReturnCategoryEntity, Long> {

    fun findByEnabledIsTrue(): List<FoodReturnCategoryEntity>
}
