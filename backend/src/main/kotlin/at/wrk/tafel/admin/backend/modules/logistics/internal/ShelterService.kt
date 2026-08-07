package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.ShelterContactEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterContactItem
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterResponse
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class ShelterService(
    private val shelterRepository: ShelterRepository,
) {

    @Transactional(readOnly = true)
    fun getActiveShelters(): List<ShelterResponse> = shelterRepository.findByEnabledIsTrue()
        .map { mapShelter(it) }
        .sortedWith(compareBy({ it.sortOrder }, { it.name }))

    @Transactional(readOnly = true)
    fun getAllShelters(): List<ShelterResponse> = shelterRepository.findAll()
        .map { mapShelter(it) }
        .sortedWith(compareBy({ it.sortOrder }, { it.name }))

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
            addressStairway = shelter.addressStairway
            addressDoor = shelter.addressDoor
            note = shelter.note
        }

        // attach contacts
        shelterEntity.contacts = shelter.contacts.map { contact ->
            ShelterContactEntity(shelter = shelterEntity, phone = contact.phone).apply {
                firstname = contact.firstname
                lastname = contact.lastname
            }
        }.toMutableList()

        val savedEntity = shelterRepository.save(shelterEntity)
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
    )

    fun updateShelter(shelterId: Long, updatedShelter: ShelterRequest): ShelterResponse {
        val shelterEntity = shelterRepository.findByIdOrNull(shelterId)
            ?: throw NotFoundException("Shelter with id $shelterId not found")

        shelterEntity.name = updatedShelter.name
        shelterEntity.addressStreet = updatedShelter.addressStreet
        shelterEntity.addressHouseNumber = updatedShelter.addressHouseNumber
        shelterEntity.addressStairway = updatedShelter.addressStairway
        shelterEntity.addressPostalCode = updatedShelter.addressPostalCode
        shelterEntity.addressCity = updatedShelter.addressCity
        shelterEntity.addressDoor = updatedShelter.addressDoor
        shelterEntity.note = updatedShelter.note
        shelterEntity.personsCount = updatedShelter.personsCount
        shelterEntity.enabled = updatedShelter.enabled
        shelterEntity.sortOrder = updatedShelter.sortOrder

        // replace contacts
        shelterEntity.contacts = updatedShelter.contacts.map { contact ->
            ShelterContactEntity(shelter = shelterEntity, phone = contact.phone).apply {
                firstname = contact.firstname
                lastname = contact.lastname
            }
        }.toMutableList()

        val savedEntity = shelterRepository.save(shelterEntity)
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
    }

    private fun nextSortOrder(): Int = (shelterRepository.findAll().maxOfOrNull { it.sortOrder } ?: 0) + 1
}
