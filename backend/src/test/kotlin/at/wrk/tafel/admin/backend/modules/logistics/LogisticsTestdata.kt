package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticShelterEntity
import at.wrk.tafel.admin.backend.database.model.logistics.*
import at.wrk.tafel.admin.backend.modules.base.employee.testEmployee1
import at.wrk.tafel.admin.backend.modules.base.employee.testEmployee2
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionEntity
import java.math.BigDecimal
import java.time.LocalDateTime
import java.time.LocalTime

val testShop1 = ShopEntity(
    number = 1,
    name = "Billa",
    address = ShopAddress(street = "Street 1", postalCode = 1234, city = "City"),
).apply { id = 1 }

val testShop2 = ShopEntity(
    number = 2,
    name = "Hofer",
    address = ShopAddress(street = "Street 1", postalCode = 1234, city = "City"),
).apply { id = 2 }

val testShop3 = ShopEntity(
    number = 3,
    name = "Hofer 2",
    address = ShopAddress(street = "Street 1", postalCode = 1234, city = "City"),
    foodUnit = FoodUnit.KG,
).apply { id = 3 }

val testRoute1 = RouteEntity(number = 1.0, name = "Route 1").apply {
    id = 1
    note = "Note 1"
    stops = mutableListOf(
        RouteStopEntity(route = this, time = LocalTime.MIDNIGHT.plusHours(5)).apply {
            id = 33
            shop = testShop1
        },
        RouteStopEntity(route = this, time = LocalTime.MIDNIGHT.plusMinutes(30)).apply {
            id = 22
            shop = null
            description = "Extra stop at home"
        },
        RouteStopEntity(route = this, time = LocalTime.MIDNIGHT.plusMinutes(15)).apply {
            id = 11
            shop = testShop2
        },
    )
}

val testRoute2 = RouteEntity(number = 2.0, name = "Route 2").apply {
    id = 2
    note = null
    stops = mutableListOf()
}

val testRoute3 = RouteEntity(number = 3.0, name = "Route 3").apply {
    id = 3
    note = null
    stops = mutableListOf()
}

val testRoute4 = RouteEntity(number = 4.0, name = "Route 4").apply {
    id = 4
    note = null
    stops = mutableListOf()
}

val testFoodCategory1 = FoodCategoryEntity(name = "Category 1", sortOrder = 200, enabled = true).apply {
    id = 1
    weightPerUnit = BigDecimal.TEN
}

val testFoodCategory2 = FoodCategoryEntity(name = "Category 2", sortOrder = 0, enabled = true).apply {
    id = 2
    weightPerUnit = BigDecimal("20")
}

val testFoodCategory3 = FoodCategoryEntity(name = "Category 3", sortOrder = 100, enabled = true).apply {
    id = 3
    weightPerUnit = BigDecimal("30")
}

val testFoodReturnCategory1 = FoodReturnCategoryEntity(name = "Graue Kisten", sortOrder = 2, enabled = true).apply {
    id = 11
}

val testFoodReturnCategory2 = FoodReturnCategoryEntity(name = "Klappkisten schwarz", sortOrder = 1, enabled = true).apply {
    id = 12
}

val testFoodReturnCategory3 = FoodReturnCategoryEntity(name = "Ströck Kisten", sortOrder = 3, enabled = false).apply {
    id = 13
}

val testCar1 = CarEntity(licensePlate = "W-123", sortOrder = 1, enabled = true).apply {
    id = 1
    name = "Car 123"
}

val testCar2 = CarEntity(licensePlate = "W-456", sortOrder = 2, enabled = true).apply {
    id = 2
    name = "Car 456"
}

val testFoodCollectionRoute1Entity = FoodCollectionEntity(distribution = testDistributionEntity, route = testRoute1).apply {
    car = testCar1
    driver = testEmployee1
    coDriver = testEmployee2
    kmStart = 12345
    kmEnd = 23456
    items = listOf(
        FoodCollectionItemEntity(category = testFoodCategory1, shop = testShop1, amount = 0),
        FoodCollectionItemEntity(category = testFoodCategory1, shop = testShop2, amount = 2),
        FoodCollectionItemEntity(category = testFoodCategory3, shop = testShop1, amount = 0),
        FoodCollectionItemEntity(category = testFoodCategory3, shop = testShop2, amount = 4),
    )
    returnItems = listOf(
        FoodCollectionReturnItemEntity(shop = testShop1, description = "Graue Kisten", amount = 3),
        FoodCollectionReturnItemEntity(shop = testShop2, description = "Bananenkartons", amount = 1),
    )
}

val testFoodCollectionRoute2Entity = FoodCollectionEntity(distribution = testDistributionEntity, route = testRoute2).apply {
    kmStart = 100
    kmEnd = 200
    items = listOf(
        FoodCollectionItemEntity(category = testFoodCategory3, shop = testShop3, amount = 5),
    )
    returnItems = listOf(
        FoodCollectionReturnItemEntity(shop = testShop3, description = "Klappkisten schwarz", amount = 2),
    )
}

val testFoodCollectionRoute3Entity = FoodCollectionEntity(distribution = testDistributionEntity, route = testRoute3).apply {
    items = emptyList()
}

val testFoodCollectionRoute4Entity = FoodCollectionEntity(distribution = testDistributionEntity, route = testRoute4).apply {
    kmStart = 10
    kmEnd = 20
    items = listOf(
        FoodCollectionItemEntity(category = testFoodCategory1, shop = testShop3, amount = 5),
    )
}

val testShelter1 = ShelterEntity(
    name = "Shelter 1",
    addressStreet = "Street",
    addressHouseNumber = "1",
    addressPostalCode = 1234,
    addressCity = "City 1",
    personsCount = 1,
    sortOrder = 1,
    enabled = true,
).apply {
    id = 1
    addressStairway = "A"
    addressDoor = "1"
    note = "Note 1"
}

// throwaway owning statistic - only the shelter fields below are asserted on in tests
private val placeholderDistributionStatistic = DistributionStatisticEntity(
    distribution = DistributionEntity(
        startedAt = LocalDateTime.now(),
        startedByUser = UserEntity(
            username = "placeholder",
            password = "placeholder",
            employee = EmployeeEntity(personnelNumber = "placeholder", firstname = "placeholder", lastname = "placeholder"),
        ),
    ),
)

val testDistributionStatisticShelterEntity1 = DistributionStatisticShelterEntity(
    statistic = placeholderDistributionStatistic,
    name = testShelter1.name,
    addressStreet = testShelter1.addressStreet,
    addressHouseNumber = testShelter1.addressHouseNumber,
    addressPostalCode = testShelter1.addressPostalCode,
    addressCity = testShelter1.addressCity,
    personsCount = testShelter1.personsCount,
    sortOrder = testShelter1.sortOrder,
).apply {
    id = 1
    addressStairway = testShelter1.addressStairway
    addressDoor = testShelter1.addressDoor
}

val testShelter2 = ShelterEntity(
    name = "Shelter 2",
    addressStreet = "Street",
    addressHouseNumber = "2",
    addressPostalCode = 4321,
    addressCity = "City 2",
    personsCount = 2,
    sortOrder = 2,
    enabled = true,
).apply {
    id = 2
    addressStairway = "A"
    addressDoor = "2"
    note = "Note 2"
}

val testShelter3 = ShelterEntity(
    name = "Shelter 3",
    addressStreet = "Street",
    addressHouseNumber = "3",
    addressPostalCode = 4321,
    addressCity = "City 3",
    personsCount = 3,
    sortOrder = 3,
    enabled = false,
).apply {
    id = 3
    addressStairway = "A"
    addressDoor = "3"
    note = "Note 3"
}

val testDistributionStatisticShelterEntity2 = DistributionStatisticShelterEntity(
    statistic = placeholderDistributionStatistic,
    name = testShelter2.name,
    addressStreet = testShelter2.addressStreet,
    addressHouseNumber = testShelter2.addressHouseNumber,
    addressPostalCode = testShelter2.addressPostalCode,
    addressCity = testShelter2.addressCity,
    personsCount = testShelter2.personsCount,
    sortOrder = testShelter2.sortOrder,
).apply {
    id = 1
    addressStairway = testShelter2.addressStairway
    addressDoor = testShelter2.addressDoor
}
