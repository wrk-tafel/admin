package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.common.sanitizeForLog
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryRepository
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterContactEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterFixedQuantityEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterRepository
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterContactItem
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterFixedQuantityItem
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterResponse
import org.slf4j.LoggerFactory
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class ShelterService(
    private val shelterRepository: ShelterRepository,
    private val foodCategoryRepository: FoodCategoryRepository,
) {

    companion object {
        private val log = LoggerFactory.getLogger(ShelterService::class.java)
    }

    @Transactional(readOnly = true)
    fun getActiveShelters(): List<ShelterResponse> = shelterRepository.findByEnabledIsTrue()
        .map { mapShelter(it) }
        .sortedWith(compareBy({ it.sortOrder }, { it.name }))

    @Transactional(readOnly = true)
    fun getAllShelters(): List<ShelterResponse> = shelterRepository.findAll()
        .map { mapShelter(it) }
        .sortedWith(compareBy({ it.sortOrder }, { it.name }))

    @Transactional
    fun createShelter(shelter: ShelterRequest): ShelterResponse {
        val shelterEntity = ShelterEntity(
            name = shelter.name,
            addressStreet = shelter.addressStreet,
            addressHouseNumber = shelter.addressHouseNumber,
            addressPostalCode = shelter.addressPostalCode,
            addressCity = shelter.addressCity,
            personsCount = shelter.personsCount,
            sortOrder = nextSortOrder(),
            enabled = shelter.enabled,
        ).apply {
            addressStairway = shelter.addressStairway?.takeIf { it.isNotBlank() }?.trim()
            addressDoor = shelter.addressDoor?.takeIf { it.isNotBlank() }?.trim()
            note = shelter.note
            applyNeeds(this, shelter)
            foodCategories = findFoodCategories(shelter.foodCategoryIds)
            excludedFoodCategories = findFoodCategories(shelter.excludedFoodCategoryIds)
        }

        // attach contacts
        shelterEntity.contacts = shelter.contacts.map { contact ->
            ShelterContactEntity(shelter = shelterEntity, phone = contact.phone).apply {
                firstname = contact.firstname
                lastname = contact.lastname
            }
        }.toMutableList()

        val savedEntity = shelterRepository.save(shelterEntity)
        log.info("Created shelter {} ({})", savedEntity.id, sanitizeForLog(savedEntity.name))
        return mapShelter(savedEntity)
    }

    private fun mapShelter(shelterEntity: ShelterEntity): ShelterResponse = ShelterResponse(
        id = shelterEntity.id!!,
        name = shelterEntity.name,
        addressStreet = shelterEntity.addressStreet,
        addressHouseNumber = shelterEntity.addressHouseNumber,
        addressStairway = shelterEntity.addressStairway,
        addressPostalCode = shelterEntity.addressPostalCode,
        addressCity = shelterEntity.addressCity,
        addressDoor = shelterEntity.addressDoor,
        note = shelterEntity.note,
        personsCount = shelterEntity.personsCount,
        enabled = shelterEntity.enabled,
        sortOrder = shelterEntity.sortOrder,
        contacts = shelterEntity.contacts.map {
            ShelterContactItem(
                firstname = it.firstname,
                lastname = it.lastname,
                phone = it.phone,
            )
        },
        hasKitchen = shelterEntity.hasKitchen,
        hasFreezer = shelterEntity.hasFreezer,
        restrictions = shelterEntity.restrictions,
        fixedQuantities = shelterEntity.fixedQuantities.map {
            ShelterFixedQuantityItem(foodCategoryId = it.foodCategory.id!!, amount = it.amount, note = it.note)
        },
        foodCategoryIds = sortedIds(shelterEntity.foodCategories),
        excludedFoodCategoryIds = sortedIds(shelterEntity.excludedFoodCategories),
    )

    private fun sortedIds(foodCategories: Set<FoodCategoryEntity>): List<Long> = foodCategories
        .sortedWith(compareBy({ it.sortOrder }, { it.name }))
        .map { it.id!! }

    private fun applyNeeds(shelterEntity: ShelterEntity, shelter: ShelterRequest) {
        shelterEntity.hasKitchen = shelter.hasKitchen
        shelterEntity.hasFreezer = shelter.hasFreezer
        shelterEntity.restrictions = shelter.restrictions?.trim()?.ifBlank { null }

        val categoriesById = findFoodCategories(shelter.fixedQuantities.map { it.foodCategoryId }).associateBy { it.id }
        // replaced in place, like the other collections - see updateShelter
        shelterEntity.fixedQuantities.clear()
        shelterEntity.fixedQuantities.addAll(
            shelter.fixedQuantities.map {
                ShelterFixedQuantityEntity(
                    foodCategory = categoriesById.getValue(it.foodCategoryId),
                    amount = it.amount,
                    note = it.note?.trim()?.ifBlank { null },
                )
            },
        )
    }

    @Transactional
    fun updateShelter(shelterId: Long, updatedShelter: ShelterRequest): ShelterResponse {
        val shelterEntity = shelterRepository.findByIdOrNull(shelterId)
            ?: throw NotFoundException("Shelter with id $shelterId not found")

        shelterEntity.name = updatedShelter.name
        shelterEntity.addressStreet = updatedShelter.addressStreet
        shelterEntity.addressHouseNumber = updatedShelter.addressHouseNumber
        shelterEntity.addressStairway = updatedShelter.addressStairway?.takeIf { it.isNotBlank() }?.trim()
        shelterEntity.addressPostalCode = updatedShelter.addressPostalCode
        shelterEntity.addressCity = updatedShelter.addressCity
        shelterEntity.addressDoor = updatedShelter.addressDoor?.takeIf { it.isNotBlank() }?.trim()
        shelterEntity.note = updatedShelter.note
        shelterEntity.personsCount = updatedShelter.personsCount
        shelterEntity.enabled = updatedShelter.enabled
        shelterEntity.sortOrder = updatedShelter.sortOrder
        applyNeeds(shelterEntity, updatedShelter)

        // replaced in place - the entity is managed here, and swapping out an orphan-removal
        // collection for a new instance is something Hibernate refuses on flush
        val foodCategories = findFoodCategories(updatedShelter.foodCategoryIds)
        shelterEntity.foodCategories.clear()
        shelterEntity.foodCategories.addAll(foodCategories)
        val excludedFoodCategories = findFoodCategories(updatedShelter.excludedFoodCategoryIds)
        shelterEntity.excludedFoodCategories.clear()
        shelterEntity.excludedFoodCategories.addAll(excludedFoodCategories)

        shelterEntity.contacts.clear()
        shelterEntity.contacts.addAll(
            updatedShelter.contacts.map { contact ->
                ShelterContactEntity(shelter = shelterEntity, phone = contact.phone).apply {
                    firstname = contact.firstname
                    lastname = contact.lastname
                }
            },
        )

        val savedEntity = shelterRepository.save(shelterEntity)
        log.info("Updated shelter {} ({})", savedEntity.id, sanitizeForLog(savedEntity.name))
        return mapShelter(savedEntity)
    }

    @Transactional
    fun reorderShelters(shelterIds: List<Long>) {
        shelterIds.forEachIndexed { index, shelterId ->
            val entity = shelterRepository.findByIdOrNull(shelterId)
                ?: throw NotFoundException("Shelter with id $shelterId not found")

            entity.sortOrder = index + 1
            shelterRepository.save(entity)
        }
        log.info("Reordered shelters: {}", shelterIds)
    }

    private fun findFoodCategories(foodCategoryIds: List<Long>): MutableSet<FoodCategoryEntity> {
        val requestedIds = foodCategoryIds.toSet()
        val foodCategories = foodCategoryRepository.findAllById(requestedIds)
        val unknownIds = requestedIds - foodCategories.mapNotNull { it.id }.toSet()
        if (unknownIds.isNotEmpty()) {
            throw BusinessRuleException("Unknown food categories: $unknownIds")
        }
        return foodCategories.toMutableSet()
    }

    private fun nextSortOrder(): Int = (shelterRepository.findAll().maxOfOrNull { it.sortOrder } ?: 0) + 1
}
