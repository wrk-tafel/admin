package at.wrk.tafel.admin.backend.database.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.flywaydb.core.api.callback.BaseCallback
import org.flywaydb.core.api.callback.Context
import org.flywaydb.core.api.callback.Event
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.core.io.ClassPathResource
import org.springframework.jdbc.datasource.init.ScriptUtils
import org.springframework.stereotype.Component

@Component
@ExcludeFromTestCoverage
class FlywayImportTestdataCallback(
    @Value("\${tafeladmin.testdata.enabled:false}") private val testdataEnabled: Boolean,
    @Value("/db-migration-testdata/testdata.sql") val sqlFileClassPath: String? = null
) : BaseCallback() {

    companion object {
        private val LOGGER = LoggerFactory.getLogger(FlywayImportTestdataCallback::class.java)
    }

    override fun handle(event: Event, context: Context) {
        if (testdataEnabled && event == Event.AFTER_MIGRATE) {
            LOGGER.info("Importing testdata ...")
            ScriptUtils.executeSqlScript(context.connection, ClassPathResource("$sqlFileClassPath"))
            LOGGER.info("Importing testdata finished!")
        }
    }

}
