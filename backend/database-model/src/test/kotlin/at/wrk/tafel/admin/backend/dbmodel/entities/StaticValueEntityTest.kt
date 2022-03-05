package at.wrk.tafel.admin.backend.dbmodel.entities

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class StaticValueEntityTest {

    @Test
    fun `StaticValueType - value of age 0`() {
        val type = StaticValueType.valueOfAge(0)

        assertThat(type).isEqualTo(StaticValueType.INCFAMBONAGE0)
    }

    @Test
    fun `StaticValueType - value of age 1`() {
        val type = StaticValueType.valueOfAge(1)

        assertThat(type).isEqualTo(StaticValueType.INCFAMBONAGE0)
    }

    @Test
    fun `StaticValueType - value of age 3`() {
        val type = StaticValueType.valueOfAge(3)

        assertThat(type).isEqualTo(StaticValueType.INCFAMBONAGE3)
    }

    @Test
    fun `StaticValueType - value of age 30`() {
        val type = StaticValueType.valueOfAge(30)

        assertThat(type).isEqualTo(StaticValueType.INCFAMBONAGE19)
    }
}
