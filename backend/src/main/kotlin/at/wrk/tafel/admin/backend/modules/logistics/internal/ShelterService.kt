package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.ShelterEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterRepository
import at.wrk.tafel.admin.backend.modules.logistics.model.Shelter
import org.springframework.stereotype.Service

@Service
class ShelterService(
    private val shelterRepository: ShelterRepository
) {

    fun getShelters(): List<Shelter> {
        val shelters = shelterRepository.findAll().toList()
        return shelters.map { mapShelter(it) }
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
            personsCount = shelterEntity.personsCount!!
        )
    }

}
