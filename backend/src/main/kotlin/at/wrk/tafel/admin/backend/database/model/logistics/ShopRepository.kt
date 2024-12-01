package at.wrk.tafel.admin.backend.database.model.logistics

import org.springframework.data.jpa.repository.JpaRepository

interface ShopRepository : JpaRepository<ShopEntity, Long>