package at.wrk.tafel.admin.backend.database.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.apache.commons.io.IOUtils
import org.flywaydb.core.api.callback.BaseCallback
import org.flywaydb.core.api.callback.Context
import org.flywaydb.core.api.callback.Event
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component

@Component
@ExcludeFromTestCoverage
class FlywayImportTestdataCallback(
    @Value("\${tafeladmin.testdata.enabled:false}") private val testdataEnabled: Boolean
) : BaseCallback() {

    override fun handle(event: Event, context: Context) {
        if (testdataEnabled && event == Event.AFTER_MIGRATE) {
            val sqlLines =
                (IOUtils.readLines(javaClass.getResourceAsStream("/db-migration-testdata/data.sql")) as List<String>)
                    .filter { !it.startsWith("--") }
                    .filter { it.isNotBlank() }
                    .joinToString("") { it }
                    .split(";")
                    .filter { it.isNotBlank() }
                    .map { "$it;" }

            sqlLines.forEach { sql ->
                context.connection.createStatement().use { select ->
                    select.execute(sql)
                }
            }
        }
    }

}
