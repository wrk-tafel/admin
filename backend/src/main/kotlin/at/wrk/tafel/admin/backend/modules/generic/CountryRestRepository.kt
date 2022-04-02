package at.wrk.tafel.admin.backend.modules.generic

import at.wrk.tafel.admin.backend.database.entities.staticdata.CountryEntity
import org.springframework.cache.annotation.Cacheable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.rest.core.annotation.RepositoryRestResource

@RepositoryRestResource(path = "countries", collectionResourceRel = "countries")
interface CountryRestRepository : JpaRepository<CountryEntity, Long> {
    @Cacheable("countries")
    override fun findAll(): MutableList<CountryEntity>
}
