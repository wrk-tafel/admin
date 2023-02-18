package at.wrk.tafel.admin.backend.database.entities.checkin

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.entities.base.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table

@Entity(name = "Ticket")
@Table(name = "ticket_numbers")
@ExcludeFromTestCoverage
class TicketNumberEntity : BaseEntity() {
    @Column(name = "number")
    var number: Int? = null
}
