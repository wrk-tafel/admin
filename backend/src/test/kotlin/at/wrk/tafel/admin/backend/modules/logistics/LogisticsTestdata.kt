package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.database.model.logistics.FoodCategoryEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShopEntity
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
    name = "Route 2"
    note = null
    stops = emptyList()
}

val testFoodCategory1 = FoodCategoryEntity().apply {
    id = 1
    name = "Category 1"
}

val testFoodCategory2 = FoodCategoryEntity().apply {
    id = 2
    name = "Category 2"
}
