package at.wrk.tafel.admin.backend.modules.base.employee

import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity

val testEmployee1 = EmployeeEntity(
    personnelNumber = "111",
    firstname = "employee firstname 1",
    lastname = "employee lastname 1",
).apply { id = 1 }

val testEmployee2 = EmployeeEntity(
    personnelNumber = "222",
    firstname = "employee firstname 2",
    lastname = "employee lastname 2",
).apply { id = 2 }
