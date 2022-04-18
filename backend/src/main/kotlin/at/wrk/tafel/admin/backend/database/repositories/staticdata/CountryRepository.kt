package at.wrk.tafel.admin.backend.database.repositories.staticdata

import at.wrk.tafel.admin.backend.database.entities.staticdata.CountryEntity
import org.springframework.data.jpa.repository.JpaRepository

interface CountryRepository : JpaRepository<CountryEntity, Long> {
    fun findByCode(code: String): CountryEntity
}
