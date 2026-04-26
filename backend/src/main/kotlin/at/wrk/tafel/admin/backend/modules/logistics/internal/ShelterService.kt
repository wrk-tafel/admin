package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.ShelterEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.logistics.model.Shelter
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterContact
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterContactEntity
import jakarta.transaction.Transactional
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service

@Service
class ShelterService(
    private val shelterRepository: ShelterRepository
) {

    @Transactional
    fun getActiveShelters(): List<Shelter> {
        return shelterRepository.findByEnabledIsTrue()
            .map { mapShelter(it) }
            .sortedBy { it.name }
    }

    @Transactional
    fun getAllShelters(): List<Shelter> {
        return shelterRepository.findAll()
            .map { mapShelter(it) }
            .sortedBy { it.name }
    }

    fun createShelter(shelter: Shelter): Shelter {
        val shelterEntity = ShelterEntity().apply {
            name = shelter.name
            addressStreet = shelter.addressStreet
            addressHouseNumber = shelter.addressHouseNumber
            addressStairway = shelter.addressStairway
            addressPostalCode = shelter.addressPostalCode
            addressCity = shelter.addressCity
            addressDoor = shelter.addressDoor
            note = shelter.note
            personsCount = shelter.personsCount
            enabled = shelter.enabled
        }

        // attach contacts
        shelterEntity.contacts = shelter.contacts.map { contact ->
            ShelterContactEntity().apply {
                firstname = contact.firstname
                lastname = contact.lastname
                phone = contact.phone
                this.shelter = shelterEntity
            }
        }.toMutableList()

        val savedEntity = shelterRepository.save(shelterEntity)
        return mapShelter(savedEntity)
    }

    private fun mapShelter(shelterEntity: ShelterEntity): Shelter {
        return Shelter(
            id = shelterEntity.id!!,
            name = shelterEntity.name!!,
            addressStreet = shelterEntity.addressStreet!!,
            addressHouseNumber = shelterEntity.addressHouseNumber!!,
            addressStairway = shelterEntity.addressStairway,
            addressPostalCode = shelterEntity.addressPostalCode!!,
            addressCity = shelterEntity.addressCity!!,
            addressDoor = shelterEntity.addressDoor,
            note = shelterEntity.note,
            personsCount = shelterEntity.personsCount!!,
            enabled = shelterEntity.enabled!!,
            contacts = shelterEntity.contacts.map {
                ShelterContact(
                    firstname = it.firstname,
                    lastname = it.lastname,
                    phone = it.phone!!
                )
            }
        )
    }

    fun updateShelter(shelterId: Long, updatedShelter: Shelter): Shelter {
        val shelterEntity = shelterRepository.findByIdOrNull(shelterId)
            ?: throw TafelValidationException("Shelter with id $shelterId not found")

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

        // replace contacts
        shelterEntity.contacts = updatedShelter.contacts.map { contact ->
            ShelterContactEntity().apply {
                firstname = contact.firstname
                lastname = contact.lastname
                phone = contact.phone
                this.shelter = shelterEntity
            }
        }.toMutableList()

        val savedEntity = shelterRepository.save(shelterEntity)
        return mapShelter(savedEntity)
    }

}
