package at.wrk.tafel.admin.backend.database.model.logistics

import org.springframework.data.jpa.repository.JpaRepository

interface RouteShopRepository : JpaRepository<RouteStopEntity, Long>