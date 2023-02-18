package at.wrk.tafel.admin.backend.database.repositories.checkin

import at.wrk.tafel.admin.backend.database.entities.checkin.TicketNumberEntity
import org.springframework.data.jpa.repository.JpaRepository

interface TicketNumberRepository : JpaRepository<TicketNumberEntity, Long>