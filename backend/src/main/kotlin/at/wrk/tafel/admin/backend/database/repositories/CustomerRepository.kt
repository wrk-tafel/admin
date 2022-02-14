package at.wrk.tafel.admin.backend.database.repositories

import at.wrk.tafel.admin.backend.database.entities.CustomerEntity
import org.springframework.data.repository.CrudRepository

interface CustomerRepository : CrudRepository<CustomerEntity, Long>
