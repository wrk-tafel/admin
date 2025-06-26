package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticShelterEntity
import at.wrk.tafel.admin.backend.database.model.logistics.*
import at.wrk.tafel.admin.backend.modules.base.employee.testEmployee1
import at.wrk.tafel.admin.backend.modules.base.employee.testEmployee2
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionEntity
import java.math.BigDecimal
import java.time.LocalTime

val testShop1 = ShopEntity().apply {
    id = 1
    number = 1
    name = "Billa"
    address = ShopAddress().apply {
        street = "Street 1"
        postalCode = 1234
        city = "City"
    }
}

val testShop2 = ShopEntity().apply {
    id = 2
    number = 2
    name = "Hofer"
    address = ShopAddress().apply {
        street = "Street 1"
        postalCode = 1234
        city = "City"
    }
}

val testShop3 = ShopEntity().apply {
    id = 3
    number = 3
    name = "Hofer 2"
    foodUnit = FoodUnit.KG
    address = ShopAddress().apply {
        street = "Street 1"
        postalCode = 1234
        city = "City"
    }
}

val testRoute1 = RouteEntity().apply {
    id = 1
    number = 1.0
    name = "Route 1"
    note = "Note 1"
    stops = listOf(
        RouteStopEntity().apply {
            id = 33
            shop = testShop1
            time = LocalTime.MIDNIGHT.plusHours(5)
        },
        RouteStopEntity().apply {
            id = 22
            shop = null
            time = LocalTime.MIDNIGHT.plusMinutes(30)
            description = "Extra stop at home"
        },
        RouteStopEntity().apply {
            id = 11
            shop = testShop2
            time = LocalTime.MIDNIGHT.plusMinutes(15)
        }
    )
}

val testRoute2 = RouteEntity().apply {
    id = 2
    number = 2.0
    name = "Route 2"
    note = null
    stops = emptyList()
}

val testRoute3 = RouteEntity().apply {
    id = 3
    number = 3.0
    name = "Route 3"
    note = null
    stops = emptyList()
}

val testRoute4 = RouteEntity().apply {
    id = 4
    number = 4.0
    name = "Route 4"
    note = null
    stops = emptyList()
}


val testFoodCategory1 = FoodCategoryEntity().apply {
    id = 1
    name = "Category 1"
    weightPerUnit = BigDecimal.TEN
    returnItem = false
}

val testFoodCategory2 = FoodCategoryEntity().apply {
    id = 2
    name = "Category 2"
    weightPerUnit = BigDecimal("20")
    returnItem = true
}

val testFoodCategory3 = FoodCategoryEntity().apply {
    id = 3
    name = "Category 3"
    weightPerUnit = BigDecimal("30")
    returnItem = false
}

val testCar1 = CarEntity().apply {
    id = 1
    licensePlate = "W-123"
    name = "Car 123"
}

val testCar2 = CarEntity().apply {
    id = 2
    licensePlate = "W-456"
    name = "Car 456"
}

val testFoodCollectionRoute1Entity = FoodCollectionEntity().apply {
    distribution = testDistributionEntity
    car = testCar1
    driver = testEmployee1
    coDriver = testEmployee2
    route = testRoute1
    kmStart = 12345
    kmEnd = 23456
    items = listOf(
        FoodCollectionItemEntity().apply {
            category = testFoodCategory1
            shop = testShop1
            amount = 0
        },
        FoodCollectionItemEntity().apply {
            category = testFoodCategory1
            shop = testShop2
            amount = 2
        },
        FoodCollectionItemEntity().apply {
            category = testFoodCategory2
            shop = testShop1
            amount = null
        },
        FoodCollectionItemEntity().apply {
            category = testFoodCategory2
            shop = testShop2
            amount = 4
        }
    )
}

val testFoodCollectionRoute2Entity = FoodCollectionEntity().apply {
    distribution = testDistributionEntity
    route = testRoute2
    kmStart = 100
    kmEnd = 200
    items = listOf(
        FoodCollectionItemEntity().apply {
            category = testFoodCategory2
            shop = testShop3
            amount = 5
        }
    )
}

val testFoodCollectionRoute3Entity = FoodCollectionEntity().apply {
    distribution = testDistributionEntity
    route = testRoute3
    items = emptyList()
}

val testFoodCollectionRoute4Entity = FoodCollectionEntity().apply {
    distribution = testDistributionEntity
    route = testRoute4
    kmStart = 10
    kmEnd = 20
    items = listOf(
        FoodCollectionItemEntity().apply {
            category = testFoodCategory1
            shop = testShop3
            amount = 5
        }
    )
}

val testShelter1 = ShelterEntity().apply {
    id = 1
    name = "Shelter 1"
    addressStreet = "Street"
    addressHouseNumber = "1"
    addressStairway = "A"
    addressPostalCode = 1234
    addressDoor = "1"
    addressCity = "City 1"
    note = "Note 1"
    personsCount = 1
}

val testDistributionStatisticShelterEntity1 = DistributionStatisticShelterEntity().apply {
    id = 1
    name = testShelter1.name
    addressStreet = testShelter1.addressStreet
    addressHouseNumber = testShelter1.addressHouseNumber
    addressStairway = testShelter1.addressStairway
    addressPostalCode = testShelter1.addressPostalCode
    addressDoor = testShelter1.addressDoor
    addressCity = testShelter1.addressCity
    personsCount = testShelter1.personsCount
}

val testShelter2 = ShelterEntity().apply {
    id = 2
    name = "Shelter 2"
    addressStreet = "Street"
    addressHouseNumber = "2"
    addressStairway = "A"
    addressPostalCode = 4321
    addressDoor = "2"
    addressCity = "City 2"
    note = "Note 2"
    personsCount = 2
}

val testDistributionStatisticShelterEntity2 = DistributionStatisticShelterEntity().apply {
    id = 1
    name = testShelter2.name
    addressStreet = testShelter2.addressStreet
    addressHouseNumber = testShelter2.addressHouseNumber
    addressStairway = testShelter2.addressStairway
    addressPostalCode = testShelter2.addressPostalCode
    addressDoor = testShelter2.addressDoor
    addressCity = testShelter2.addressCity
    personsCount = testShelter2.personsCount
}
