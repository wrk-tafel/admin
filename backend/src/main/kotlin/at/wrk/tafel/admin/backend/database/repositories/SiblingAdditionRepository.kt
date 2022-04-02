package at.wrk.tafel.admin.backend.database.repositories

import at.wrk.tafel.admin.backend.database.entities.staticdata.SiblingAdditionEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.util.*

interface SiblingAdditionRepository : JpaRepository<SiblingAdditionEntity, Long> {
    @Query("select sa from SiblingAddition sa where now() between sa.validFrom and sa.validTo")
    fun findCurrentValues(): List<SiblingAdditionEntity>

    @Query("select sa from SiblingAddition sa where sa.countChild = 7 and now() between sa.validFrom and sa.validTo")
    fun findCurrentMaxAddition(): Optional<SiblingAdditionEntity>
}
