package at.wrk.tafel.admin.backend.database.model.customer

import org.springframework.data.jpa.repository.JpaRepository

interface CustomerAddPersonRepository : JpaRepository<CustomerAddPersonEntity, Long>
