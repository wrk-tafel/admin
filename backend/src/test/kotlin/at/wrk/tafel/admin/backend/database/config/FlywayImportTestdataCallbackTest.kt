package at.wrk.tafel.admin.backend.database.config

import io.mockk.*
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.flywaydb.core.api.callback.Context
import org.flywaydb.core.api.callback.Event
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.core.io.ClassPathResource
import org.springframework.core.io.Resource
import org.springframework.jdbc.datasource.init.ScriptUtils
import java.sql.Connection

@ExtendWith(MockKExtension::class)
class FlywayImportTestdataCallbackTest {

    @RelaxedMockK
    private lateinit var context: Context

    @Test
    fun `handle with testdataEnabled false and event afterMigrate should do nothing`() {
        val callback = FlywayImportTestdataCallback(false, sqlFileClassPath = "/testdata/unittest-data.sql")

        callback.handle(Event.AFTER_MIGRATE, context)

        verify(exactly = 0) { context.connection }
    }

    @Test
    fun `handle with testdataEnabled true and event not afterMigrate should do nothing`() {
        val callback = FlywayImportTestdataCallback(true, sqlFileClassPath = "/testdata/unittest-data.sql")

        callback.handle(Event.BEFORE_MIGRATE, context)

        verify(exactly = 0) { context.connection }
    }

    @Test
    fun `handle with testdataEnabled true and event afterMigrate should migrate`() {
        mockkStatic(ScriptUtils::class)
        every { ScriptUtils.executeSqlScript(any<Connection>(), any<Resource>()) } just runs
        val sqlPath = "/testdata/unittest-data.sql"

        val callback = FlywayImportTestdataCallback(testdataEnabled = true, sqlFileClassPath = sqlPath)

        callback.handle(Event.AFTER_MIGRATE, context)

        verify {
            ScriptUtils.executeSqlScript(context.connection, ClassPathResource(sqlPath))
        }
    }

}
