package at.wrk.tafel.admin.backend.database.model.auth

import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDateTime

interface LoginAttemptRepository : JpaRepository<LoginAttemptEntity, Long> {

    fun findByUsername(username: String): LoginAttemptEntity?

    fun deleteByUsername(username: String)

    fun deleteAllByLastFailureAtBefore(date: LocalDateTime)

    fun findAllByOrderByLastFailureAtDescIdDesc(pageRequest: PageRequest): Page<LoginAttemptEntity>
}
