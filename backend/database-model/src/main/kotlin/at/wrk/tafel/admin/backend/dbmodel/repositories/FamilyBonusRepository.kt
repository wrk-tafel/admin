package at.wrk.tafel.admin.backend.dbmodel.repositories

import at.wrk.tafel.admin.backend.dbmodel.entities.staticvalues.FamilyBonusEntity
import org.springframework.data.jpa.repository.JpaRepository

interface FamilyBonusRepository : JpaRepository<FamilyBonusEntity, Long>
