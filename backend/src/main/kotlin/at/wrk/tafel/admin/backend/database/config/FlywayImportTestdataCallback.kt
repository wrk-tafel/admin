package at.wrk.tafel.admin.backend.database.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.apache.commons.io.IOUtils
import org.flywaydb.core.api.callback.BaseCallback
import org.flywaydb.core.api.callback.Context
import org.flywaydb.core.api.callback.Event
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component

@Component
@ExcludeFromTestCoverage
class FlywayImportTestdataCallback(
    @Value("\${tafeladmin.testdata.enabled:false}") private val testdataEnabled: Boolean,
    @Value("/db-migration-testdata/data.sql") val sqlFilePath: String? = null
) : BaseCallback() {

    companion object {
        private val LOGGER = LoggerFactory.getLogger(FlywayImportTestdataCallback::class.java)
    }

    override fun handle(event: Event, context: Context) {
        if (testdataEnabled && event == Event.AFTER_MIGRATE) {
            LOGGER.info("Importing testdata ...")

            val sqlLines =
                (IOUtils.readLines(javaClass.getResourceAsStream(sqlFilePath)) as List<String>)
                    .filter { !it.startsWith("--") }
                    .filter { it.isNotBlank() }
                    .joinToString("") { it }
                    .split(";")
                    .filter { it.isNotBlank() }
                    .map { "$it;" }

            sqlLines.forEachIndexed { index, sql ->
                LOGGER.info("Importing testdata ... Statement ${index + 1}: $sql")

                context.connection.createStatement().use { select ->
                    select.execute(sql)
                }
            }

            LOGGER.info("Import of testdata finished!")
        }
    }

}
