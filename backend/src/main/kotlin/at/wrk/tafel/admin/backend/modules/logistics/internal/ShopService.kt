package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.common.sanitizeForLog
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.logistics.ShopAddress
import at.wrk.tafel.admin.backend.database.model.logistics.ShopEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShopRepository
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteShopItem
import at.wrk.tafel.admin.backend.modules.logistics.model.ShopRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.ShopResponse
import org.slf4j.LoggerFactory
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class ShopService(
    private val routeRepository: RouteRepository,
    private val shopRepository: ShopRepository,
) {

    companion object {
        private val log = LoggerFactory.getLogger(ShopService::class.java)
    }

    @Transactional(readOnly = true)
    fun getShopsForRouteId(routeId: Long): List<RouteShopItem> {
        val route =
            routeRepository.findByIdOrNull(routeId) ?: throw NotFoundException("Route $routeId nicht gefunden!")
        return route.stops.sortedBy { it.time }
            .mapNotNull { it.shop }
            .filter { it.enabled }
            .map { shop ->
                RouteShopItem(
                    id = shop.id!!,
                    number = shop.number,
                    name = shop.name,
                    address = shop.address.let {
                        "${it.street}, ${it.postalCode} ${it.city}"
                    },
                )
            }
    }

    @Transactional(readOnly = true)
    fun getAllShops(): List<ShopResponse> = shopRepository.findAll()
        .map { mapShop(it) }
        .sortedWith(compareBy({ it.number }, { it.name }))

    fun createShop(shop: ShopRequest): ShopResponse {
        validateNumberIsUnique(shop.number, null)

        val shopEntity = ShopEntity(
            number = shop.number,
            name = shop.name,
            address = ShopAddress(
                street = shop.addressStreet,
                postalCode = shop.addressPostalCode,
                city = shop.addressCity,
            ),
            foodUnit = shop.foodUnit,
            enabled = shop.enabled,
        ).apply {
            phone = shop.phone
            contactPerson = shop.contactPerson
            note = shop.note
        }

        val savedEntity = shopRepository.save(shopEntity)
        log.info("Created shop {} ({})", savedEntity.id, sanitizeForLog(savedEntity.name))
        return mapShop(savedEntity)
    }

    fun updateShop(shopId: Long, updatedShop: ShopRequest): ShopResponse {
        validateNumberIsUnique(updatedShop.number, shopId)

        val shopEntity = shopRepository.findByIdOrNull(shopId)
            ?: throw NotFoundException("Shop with id $shopId not found")

        shopEntity.number = updatedShop.number
        shopEntity.name = updatedShop.name
        shopEntity.address = ShopAddress(
            street = updatedShop.addressStreet,
            postalCode = updatedShop.addressPostalCode,
            city = updatedShop.addressCity,
        )
        shopEntity.foodUnit = updatedShop.foodUnit
        shopEntity.phone = updatedShop.phone
        shopEntity.contactPerson = updatedShop.contactPerson
        shopEntity.note = updatedShop.note
        shopEntity.enabled = updatedShop.enabled

        val savedEntity = shopRepository.save(shopEntity)
        log.info("Updated shop {} ({})", savedEntity.id, sanitizeForLog(savedEntity.name))
        return mapShop(savedEntity)
    }

    private fun validateNumberIsUnique(number: Int, shopId: Long?) {
        val existingShop = shopRepository.findByNumber(number)
        if (existingShop != null && existingShop.id != shopId) {
            throw BusinessRuleException("Markt-Nummer $number ist bereits vergeben!")
        }
    }

    private fun mapShop(shopEntity: ShopEntity): ShopResponse = ShopResponse(
        id = shopEntity.id!!,
        number = shopEntity.number,
        name = shopEntity.name,
        addressStreet = shopEntity.address.street,
        addressPostalCode = shopEntity.address.postalCode,
        addressCity = shopEntity.address.city,
        foodUnit = shopEntity.foodUnit,
        phone = shopEntity.phone,
        contactPerson = shopEntity.contactPerson,
        note = shopEntity.note,
        enabled = shopEntity.enabled,
    )
}
