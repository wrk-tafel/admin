package at.wrk.tafel.admin.backend.database.config

import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import io.mockk.verifySequence
import org.flywaydb.core.api.callback.Context
import org.flywaydb.core.api.callback.Event
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class FlywayImportTestdataCallbackTest {

    @RelaxedMockK
    private lateinit var context: Context

    @Test
    fun `handle with testdataEnabled false and event afterMigrate should do nothing`() {
        val callback = FlywayImportTestdataCallback(false, sqlFilePath = "/testdata/unittest-data.sql")

        callback.handle(Event.AFTER_MIGRATE, context)

        verify(exactly = 0) { context.connection }
    }

    @Test
    fun `handle with testdataEnabled true and event not afterMigrate should do nothing`() {
        val callback = FlywayImportTestdataCallback(true, sqlFilePath = "/testdata/unittest-data.sql")

        callback.handle(Event.BEFORE_MIGRATE, context)

        verify(exactly = 0) { context.connection }
    }

    @Test
    fun `handle with testdataEnabled true and event afterMigrate should migrate`() {
        val callback = FlywayImportTestdataCallback(testdataEnabled = true, sqlFilePath = "/testdata/unittest-data.sql")

        callback.handle(Event.AFTER_MIGRATE, context)

        verifySequence {
            context.connection.createStatement().use { it.execute("SELECT 1;") }
            context.connection.createStatement().use { it.execute("SELECT 2;") }
            context.connection.createStatement().use { it.execute("SELECT 3;") }
        }
    }

}
