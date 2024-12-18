package at.wrk.tafel.admin.backend.modules.reporting.internal.statistic_exporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity

interface StatisticExporter {

    fun getName(): String
    fun getRows(statistic: DistributionStatisticEntity): List<List<String>>

}
