package at.wrk.tafel.admin.backend.modules.customer

import at.wrk.tafel.admin.backend.database.entities.CustomerEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.rest.core.annotation.RepositoryRestResource
import org.springframework.security.access.prepost.PreAuthorize

@RepositoryRestResource(path = "customers", collectionResourceRel = "customers")
@PreAuthorize("hasAuthority('CUSTOMER')")
interface CustomerRestRepository : JpaRepository<CustomerEntity, Long>
