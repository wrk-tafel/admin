package at.wrk.tafel.admin.backend.database.model.logistics

import org.springframework.data.jpa.repository.JpaRepository

interface CarRepository : JpaRepository<CarEntity, Long>