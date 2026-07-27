package at.wrk.tafel.admin.backend.modules.reporting.internal.statisticexporter

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity

interface StatisticExporter {

    fun getName(): String
    fun getRows(currentStatistic: DistributionStatisticEntity): List<List<String>>
}
