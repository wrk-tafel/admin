package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.database.model.logistics.CarEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionItemEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodUnit
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShopEntity
import at.wrk.tafel.admin.backend.modules.base.employee.testEmployee1
import at.wrk.tafel.admin.backend.modules.base.employee.testEmployee2
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionEntity
import java.math.BigDecimal
import java.time.LocalTime
import java.time.temporal.ChronoUnit

val testShop1 = ShopEntity().apply {
    id = 1
    number = 1
    name = "Billa"
}

val testShop2 = ShopEntity().apply {
    id = 2
    number = 2
    name = "Hofer"
}

val testShop3 = ShopEntity().apply {
    id = 3
    number = 3
    name = "Hofer 2"
    foodUnit = FoodUnit.KG
}

val testRoute1 = RouteEntity().apply {
    id = 1
    number = 1.0
    name = "Route 1"
    note = "Note 1"
    stops = listOf(
        RouteStopEntity().apply {
            id = 11
            shop = testShop1
            time = LocalTime.now()
        },
        RouteStopEntity().apply {
            id = 11
            shop = null
            time = LocalTime.now()
            description = "Extra stop at home"
        },
        RouteStopEntity().apply {
            id = 22
            shop = testShop2
            time = LocalTime.now().plus(15, ChronoUnit.MINUTES)
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

val testFoodCategory1 = FoodCategoryEntity().apply {
    id = 1
    name = "Category 1"
    weightPerUnit = BigDecimal.TEN
    back = false
}

val testFoodCategory2 = FoodCategoryEntity().apply {
    id = 2
    name = "Category 2"
    weightPerUnit = BigDecimal("20")
    back = true
}

val testFoodCategory3 = FoodCategoryEntity().apply {
    id = 3
    name = "Category 3"
    weightPerUnit = BigDecimal("30")
    back = false
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
