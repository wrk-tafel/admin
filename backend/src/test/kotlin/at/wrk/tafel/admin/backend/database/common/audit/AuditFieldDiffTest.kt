package at.wrk.tafel.admin.backend.database.common.audit

import at.wrk.tafel.admin.backend.database.model.base.BaseEntity
import at.wrk.tafel.admin.backend.database.model.base.Gender
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate

class AuditFieldDiffTest {

    private val propertyNames = arrayOf("firstname", "lastname", "income", "createdAt", "persons")

    @Test
    fun `insert records every non-null field with a null old value`() {
        val state = arrayOf<Any?>("Max", "Mustermann", BigDecimal("1200.50"), LocalDate.now(), mutableListOf("ignored"))

        val diff = AuditFieldDiff.forInsert(propertyNames, state, emptySet())

        assertThat(diff).containsOnlyKeys("firstname", "lastname", "income")
        assertThat(diff["firstname"]).containsExactly(null, "Max")
        assertThat(diff["income"]).containsExactly(null, BigDecimal("1200.50"))
    }

    @Test
    fun `insert skips fields that were never set`() {
        val state = arrayOf<Any?>("Max", null, null, null, null)

        val diff = AuditFieldDiff.forInsert(propertyNames, state, emptySet())

        assertThat(diff).containsOnlyKeys("firstname")
    }

    @Test
    fun `delete records the last known values with a null new value`() {
        val state = arrayOf<Any?>("Max", "Mustermann", BigDecimal("1200.50"), LocalDate.now(), null)

        val diff = AuditFieldDiff.forDelete(propertyNames, state, emptySet())

        assertThat(diff).containsOnlyKeys("firstname", "lastname", "income")
        assertThat(diff["lastname"]).containsExactly("Mustermann", null)
    }

    @Test
    fun `update records only what Hibernate flagged as dirty`() {
        val oldState = arrayOf<Any?>("Max", "Mustermann", BigDecimal("1200"), null, null)
        val newState = arrayOf<Any?>("Maximilian", "Mustermann", BigDecimal("1500"), null, null)

        val diff = AuditFieldDiff.forUpdate(propertyNames, oldState, newState, intArrayOf(0, 2), emptySet())

        assertThat(diff).containsOnlyKeys("firstname", "income")
        assertThat(diff["firstname"]).containsExactly("Max", "Maximilian")
        assertThat(diff["income"]).containsExactly(BigDecimal("1200"), BigDecimal("1500"))
    }

    /**
     * Hibernate flags a property dirty on identity, so a value that compares equal can still show
     * up - filtering those out is what keeps `{"income": [1200, 1200]}` out of the log.
     */
    @Test
    fun `update drops fields whose rendered value did not actually change`() {
        val oldState = arrayOf<Any?>("Max", "Mustermann", null, null, null)
        val newState = arrayOf<Any?>("Max", "Mustermann", null, null, null)

        val diff = AuditFieldDiff.forUpdate(propertyNames, oldState, newState, intArrayOf(0, 1), emptySet())

        assertThat(diff).isEmpty()
    }

    @Test
    fun `update falls back to comparing the states when nothing was flagged dirty`() {
        val oldState = arrayOf<Any?>("Max", "Mustermann", null, null, null)
        val newState = arrayOf<Any?>("Max", "Musterfrau", null, null, null)

        val diff = AuditFieldDiff.forUpdate(propertyNames, oldState, newState, intArrayOf(), emptySet())

        assertThat(diff).containsOnlyKeys("lastname")
        assertThat(diff["lastname"]).containsExactly("Mustermann", "Musterfrau")
    }

    @Test
    fun `update without a previous state still records the change, with an unknown old value`() {
        val newState = arrayOf<Any?>("Maximilian", "Mustermann", null, null, null)

        val diff = AuditFieldDiff.forUpdate(propertyNames, null, newState, intArrayOf(0), emptySet())

        assertThat(diff["firstname"]).containsExactly(null, "Maximilian")
    }

    @Test
    fun `the bookkeeping columns and the search text are never diffed`() {
        val names = arrayOf("createdAt", "updatedAt", "createdBy", "updatedBy", "searchText", "email")
        val oldState = arrayOf<Any?>(LocalDate.now(), LocalDate.now(), "a", "a", "old text", "old@example.org")
        val newState = arrayOf<Any?>(LocalDate.now(), LocalDate.now(), "b", "b", "new text", "new@example.org")

        val diff = AuditFieldDiff.forUpdate(names, oldState, newState, intArrayOf(0, 1, 2, 3, 4, 5), emptySet())

        assertThat(diff).containsOnlyKeys("email")
    }

    @Test
    fun `redacted fields are recorded as changed but never with their values`() {
        val names = arrayOf("password")

        val diff = AuditFieldDiff.forUpdate(names, arrayOf<Any?>("old-hash"), arrayOf<Any?>("new-hash"), intArrayOf(0), setOf("password"))
        assertThat(diff["password"]).containsExactly("***", "***")

        val insertDiff = AuditFieldDiff.forInsert(names, arrayOf<Any?>("new-hash"), setOf("password"))
        assertThat(insertDiff["password"]).containsExactly(null, "***")
    }

    /**
     * The redaction happens after the comparison, never before - comparing the masked forms would
     * make every password change look like no change at all.
     */
    @Test
    fun `a password that did not change produces no entry`() {
        val names = arrayOf("password")

        val diff = AuditFieldDiff.forUpdate(names, arrayOf<Any?>("same-hash"), arrayOf<Any?>("same-hash"), intArrayOf(0), setOf("password"))

        assertThat(diff).isEmpty()
    }

    @Test
    fun `associations render as the referenced row's id`() {
        val referenced = TestEntity().apply { id = 42L }

        assertThat(AuditFieldDiff.renderValue("household", referenced, emptySet())).isEqualTo(42L)
    }

    @Test
    fun `enums render as their name and temporal values as text`() {
        assertThat(AuditFieldDiff.renderValue("gender", Gender.FEMALE, emptySet())).isEqualTo("FEMALE")
        assertThat(AuditFieldDiff.renderValue("birthDate", LocalDate.of(1990, 1, 2), emptySet())).isEqualTo("1990-01-02")
    }

    private class TestEntity : BaseEntity()
}
