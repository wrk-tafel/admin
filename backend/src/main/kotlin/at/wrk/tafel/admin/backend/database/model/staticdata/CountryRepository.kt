package at.wrk.tafel.admin.backend.database.model.staticdata

import org.springframework.data.jpa.repository.JpaRepository

interface CountryRepository : JpaRepository<CountryEntity, Long> {
    fun findByEnabledIsTrue(): List<CountryEntity>
    fun findByCode(code: String): CountryEntity?
}
