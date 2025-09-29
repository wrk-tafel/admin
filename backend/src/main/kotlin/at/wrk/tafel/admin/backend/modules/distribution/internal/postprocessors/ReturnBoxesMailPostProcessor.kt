package at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.thymeleaf.context.Context
import java.time.format.DateTimeFormatter

@Component
class ReturnBoxesMailPostProcessor(
    private val mailSenderService: MailSenderService,
) : DistributionPostProcessor {

    companion object {
        private val logger = LoggerFactory.getLogger(ReturnBoxesMailPostProcessor::class.java)
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    override fun process(distribution: DistributionEntity, statistic: DistributionStatisticEntity) {
        val dateFormatted = distribution.startedAt!!.format(DATE_TIME_FORMATTER)

        val mailSubject = "TÖ Tafel 1030 - Retourkisten vom $dateFormatted"
        val returnBoxes = createReturnBoxesData(distribution)

        val ctx = Context()
        ctx.setVariable("distributionDate", dateFormatted)
        ctx.setVariable("returnBoxes", returnBoxes)

        mailSenderService.sendHtmlMail(
            mailType = MailType.RETURN_BOXES,
            subject = mailSubject,
            attachments = emptyList(),
            templateName = "mails/return-boxes-mail",
            context = ctx
        )

        logger.info("Mail for return boxes '$mailSubject' sent!")
    }

    private fun createReturnBoxesData(distribution: DistributionEntity): ReturnBoxesDataModel {
        val uniqueRoutes = distribution.foodCollections.mapNotNull { it.route }
            .distinctBy { it.id }
            .sortedBy { it.name }

        val routes = uniqueRoutes.mapNotNull { route ->
            val uniqueShopsPerRoute = distribution.foodCollections.asSequence()
                .filter { it.route!!.id == route.id }
                .flatMap { it.items ?: emptyList() }
                .mapNotNull { it.shop }
                .distinctBy { it.id }
                .sortedBy { it.name }
                .toList()

            val shops = uniqueShopsPerRoute.mapNotNull { shop ->
                val uniqueReturnCategories = distribution.foodCollections
                    .asSequence()
                    .filter { it.route!!.id == route.id }
                    .flatMap { it.items ?: emptyList() }
                    .mapNotNull { it.category }
                    .filter { it.returnItem == true }
                    .distinctBy { it.id }
                    .sortedBy { it.name }
                    .toList()

                val returnBoxes = uniqueReturnCategories.mapNotNull { category ->
                    val amount = distribution.foodCollections.flatMap { it.items ?: emptyList() }
                        .filter { it.shop!!.id == shop.id }
                        .filter { it.category!!.id == category.id }
                        .sumOf { it.amount ?: 0 }

                    if (amount > 0) "${amount}x ${category.name}" else null
                }.joinToString(", ")

                if (returnBoxes.trim().isNotEmpty()) {
                    val address = listOfNotNull(
                        shop.address?.street,
                        shop.address?.postalCode,
                        shop.address?.city
                    )
                        .joinToString(", ")
                        .ifEmpty { "" }

                    ReturnBoxesShop(
                        name = "${shop.number} ${shop.name}",
                        address = address,
                        returnBoxes = returnBoxes
                    )
                } else null
            }

            if (shops.isNotEmpty()) {
                ReturnBoxesRoute(
                    name = route.name!!,
                    shops = shops
                )
            } else null
        }

        return ReturnBoxesDataModel(
            routes = routes
        )
    }

}

@ExcludeFromTestCoverage
data class ReturnBoxesDataModel(
    val routes: List<ReturnBoxesRoute>,
)

@ExcludeFromTestCoverage
data class ReturnBoxesRoute(
    val name: String,
    val shops: List<ReturnBoxesShop>,
)

@ExcludeFromTestCoverage
data class ReturnBoxesShop(
    val name: String,
    val address: String,
    val returnBoxes: String,
)
